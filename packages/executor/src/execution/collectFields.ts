import type {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLObjectType,
  GraphQLSchema,
  InlineFragmentNode,
  SelectionSetNode,
} from 'graphql';
import {
  getDirectiveValues,
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  isAbstractType,
  Kind,
  typeFromAST,
} from 'graphql';
import { GraphQLDeferDirective, Path, pathToArray } from '@graphql-tools/utils';
import { AccumulatorMap } from './AccumulatorMap.js';
import { invariant } from './invariant.js';

export interface DeferUsage {
  label: string | undefined;
  parentDeferUsage: DeferUsage | undefined;
  depth: number;
}

export interface FieldDetails {
  node: FieldNode;
  deferUsage: DeferUsage | undefined;
}

export type FieldGroup = ReadonlyArray<FieldDetails>;

export type GroupedFieldSet = ReadonlyMap<string, FieldGroup> & {
  encounteredDefer?: boolean;
};

interface CollectFieldsContext<TVariables = any> {
  schema: GraphQLSchema;
  fragments: Record<string, FragmentDefinitionNode>;
  variableValues: TVariables;
  errorOnSubscriptionWithIncrementalDelivery: boolean;
  runtimeType: GraphQLObjectType;
  visitedFragmentNames: Set<string>;
  encounteredDefer: boolean;
}

/**
 * Given a selectionSet, collects all of the fields and returns them.
 *
 * CollectFields requires the "runtime type" of an object. For a field that
 * returns an Interface or Union type, the "runtime type" will be the actual
 * object type returned by that field.
 *
 * @internal
 */
export function collectFields<TVariables = any>(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: TVariables,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
  errorOnSubscriptionWithIncrementalDelivery: boolean,
): GroupedFieldSet {
  const groupedFieldSet = new AccumulatorMap<string, FieldDetails>();
  const context: CollectFieldsContext = {
    schema,
    fragments,
    variableValues,
    runtimeType,
    errorOnSubscriptionWithIncrementalDelivery,
    visitedFragmentNames: new Set(),
    encounteredDefer: false,
  };

  collectFieldsImpl(context, selectionSet, groupedFieldSet);
  if (context.encounteredDefer) {
    (groupedFieldSet as GroupedFieldSet).encounteredDefer = true;
  }
  return groupedFieldSet;
}

/**
 * Given an array of field nodes, collects all of the subfields of the passed
 * in fields, and returns them at the end.
 *
 * CollectSubFields requires the "return type" of an object. For a field that
 * returns an Interface or Union type, the "return type" will be the actual
 * object type returned by that field.
 *
 * @internal
 */
export function collectSubfields(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: { [variable: string]: unknown },
  errorOnSubscriptionWithIncrementalDelivery: boolean,
  returnType: GraphQLObjectType,
  fieldGroup: FieldGroup,
  path: Path,
): GroupedFieldSet {
  const context: CollectFieldsContext = {
    schema,
    fragments,
    variableValues,
    runtimeType: returnType,
    errorOnSubscriptionWithIncrementalDelivery,
    visitedFragmentNames: new Set(),
    encounteredDefer: false,
  };
  const subGroupedFieldSet = new AccumulatorMap<string, FieldDetails>();

  for (const fieldDetail of fieldGroup) {
    const { node, deferUsage } = fieldDetail;
    if (node.selectionSet) {
      collectFieldsImpl(context, node.selectionSet, subGroupedFieldSet, path, deferUsage);
    }
  }

  if (context.encounteredDefer) {
    (subGroupedFieldSet as GroupedFieldSet).encounteredDefer = true;
  }
  return subGroupedFieldSet;
}

function collectFieldsImpl(
  context: CollectFieldsContext,
  selectionSet: SelectionSetNode,
  groupedFieldSet: AccumulatorMap<string, FieldDetails>,
  path?: Path,
  deferUsage?: DeferUsage,
): void {
  const {
    schema,
    fragments,
    variableValues,
    runtimeType,
    errorOnSubscriptionWithIncrementalDelivery,
    visitedFragmentNames,
  } = context;

  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case Kind.FIELD: {
        if (!shouldIncludeNode(variableValues, selection)) {
          continue;
        }
        groupedFieldSet.add(getFieldEntryKey(selection), {
          node: selection,
          deferUsage,
        });
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        if (
          !shouldIncludeNode(variableValues, selection) ||
          !doesFragmentConditionMatch(schema, selection, runtimeType)
        ) {
          continue;
        }

        const newDeferUsage = getDeferUsage(
          errorOnSubscriptionWithIncrementalDelivery,
          variableValues,
          selection,
          path,
          deferUsage,
        );

        if (!newDeferUsage) {
          collectFieldsImpl(context, selection.selectionSet, groupedFieldSet, path, deferUsage);
        } else {
          context.encounteredDefer = true;
          collectFieldsImpl(context, selection.selectionSet, groupedFieldSet, path, newDeferUsage);
        }

        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragName = selection.name.value;

        const newDeferUsage = getDeferUsage(
          errorOnSubscriptionWithIncrementalDelivery,
          variableValues,
          selection,
          path,
          deferUsage,
        );

        if (
          !newDeferUsage &&
          (visitedFragmentNames.has(fragName) || !shouldIncludeNode(variableValues, selection))
        ) {
          continue;
        }

        const fragment = fragments[fragName];
        if (fragment == null || !doesFragmentConditionMatch(schema, fragment, runtimeType)) {
          continue;
        }
        if (!newDeferUsage) {
          visitedFragmentNames.add(fragName);
          collectFieldsImpl(context, fragment.selectionSet, groupedFieldSet, path, deferUsage);
        } else {
          context.encounteredDefer = true;
          collectFieldsImpl(context, fragment.selectionSet, groupedFieldSet, path, newDeferUsage);
        }
        break;
      }
    }
  }
}

/**
 * Returns an object containing the `@defer` arguments if a field should be
 * deferred based on the experimental flag, defer directive present and
 * not disabled by the "if" argument.
 */
function getDeferUsage(
  errorOnSubscriptionWithIncrementalDelivery: boolean,
  variableValues: { [variable: string]: unknown },
  node: FragmentSpreadNode | InlineFragmentNode,
  path: Path | undefined,
  parentDeferUsage: DeferUsage | undefined,
): DeferUsage | undefined {
  const defer = getDirectiveValues(GraphQLDeferDirective, node, variableValues);

  if (!defer) {
    return;
  }

  if (defer['if'] === false) {
    return;
  }

  invariant(
    !errorOnSubscriptionWithIncrementalDelivery,
    '`@defer` directive not supported on subscription operations. Disable `@defer` by setting the `if` argument to `false`.',
  );

  return {
    label: typeof defer['label'] === 'string' ? defer['label'] : undefined,
    parentDeferUsage,
    depth: pathToArray(path).length,
  };
}

/**
 * Determines if a field should be included based on the `@include` and `@skip`
 * directives, where `@skip` has higher precedence than `@include`.
 */
function shouldIncludeNode(
  variableValues: { [variable: string]: unknown },
  node: FragmentSpreadNode | FieldNode | InlineFragmentNode,
): boolean {
  const skip = getDirectiveValues(GraphQLSkipDirective, node, variableValues);
  if (skip?.['if'] === true) {
    return false;
  }

  const include = getDirectiveValues(GraphQLIncludeDirective, node, variableValues);
  if (include?.['if'] === false) {
    return false;
  }
  return true;
}

/**
 * Determines if a fragment is applicable to the given type.
 */
function doesFragmentConditionMatch(
  schema: GraphQLSchema,
  fragment: FragmentDefinitionNode | InlineFragmentNode,
  type: GraphQLObjectType,
): boolean {
  const typeConditionNode = fragment.typeCondition;
  if (!typeConditionNode) {
    return true;
  }
  const conditionalType = typeFromAST(schema, typeConditionNode);
  if (conditionalType === type) {
    return true;
  }
  if (isAbstractType(conditionalType)) {
    return schema.isSubType(conditionalType, type);
  }
  return false;
}

/**
 * Implements the logic to compute the key of a given field's entry
 */
function getFieldEntryKey(node: FieldNode): string {
  return node.alias ? node.alias.value : node.name.value;
}
