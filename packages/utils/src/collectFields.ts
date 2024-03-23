import {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  getDirectiveValues,
  GraphQLIncludeDirective,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLSkipDirective,
  InlineFragmentNode,
  isAbstractType,
  Kind,
  SelectionSetNode,
  typeFromAST,
} from 'graphql';
import { getArgumentValuesFromSpread } from '@graphql-tools/executor';
import { AccumulatorMap } from './AccumulatorMap.js';
import { GraphQLDeferDirective } from './directives.js';
import { memoize5 } from './memoize.js';

export interface PatchFields {
  label: string | undefined;
  fields: Map<string, Array<FieldDetails>>;
}

export interface FieldsAndPatches {
  fields: Map<string, Array<FieldDetails>>;
  patches: Array<PatchFields>;
}

export interface FieldDetails {
  fieldNode: FieldNode;
  fragmentVariableValues?: { [key: string]: unknown } | undefined;
}

function collectFieldsImpl<TVariables = any>(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: TVariables,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
  fields: AccumulatorMap<string, FieldDetails>,
  patches: Array<PatchFields>,
  visitedFragmentNames: Set<string>,
  localVariableValues: { [variable: string]: unknown } | undefined,
): void {
  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case Kind.FIELD: {
        const vars = localVariableValues ?? variableValues;
        if (!shouldIncludeNode(vars, selection)) {
          continue;
        }
        fields.add(getFieldEntryKey(selection), { fieldNode: selection });
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        const vars = localVariableValues ?? variableValues;
        if (
          !shouldIncludeNode(vars, selection) ||
          !doesFragmentConditionMatch(schema, selection, runtimeType)
        ) {
          continue;
        }

        const defer = getDeferValues(vars, selection);

        if (defer) {
          const patchFields = new AccumulatorMap<string, FieldDetails>();
          collectFieldsImpl(
            schema,
            fragments,
            variableValues,
            runtimeType,
            selection.selectionSet,
            patchFields,
            patches,
            visitedFragmentNames,
            localVariableValues,
          );
          patches.push({
            label: defer.label,
            fields: patchFields,
          });
        } else {
          collectFieldsImpl(
            schema,
            fragments,
            variableValues,
            runtimeType,
            selection.selectionSet,
            fields,
            patches,
            visitedFragmentNames,
            localVariableValues,
          );
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const vars = localVariableValues ?? variableValues;
        const fragName = selection.name.value;

        if (!shouldIncludeNode(vars, selection)) {
          continue;
        }

        const defer = getDeferValues(vars, selection);
        if (visitedFragmentNames.has(fragName) && !defer) {
          continue;
        }

        const fragment = fragments[fragName];
        if (!fragment || !doesFragmentConditionMatch(schema, fragment, runtimeType)) {
          continue;
        }

        if (!defer) {
          visitedFragmentNames.add(fragName);
        }

        const spreadVariableValues = fragment.variableDefinitions
          ? getArgumentValuesFromSpread(
              selection,
              schema,
              fragment.variableDefinitions,
              variableValues as any,
              localVariableValues,
            )
          : undefined;

        if (defer) {
          const patchFields = new AccumulatorMap<string, FieldDetails>();
          collectFieldsImpl(
            schema,
            fragments,
            variableValues,
            runtimeType,
            fragment.selectionSet,
            patchFields,
            patches,
            visitedFragmentNames,
            spreadVariableValues,
          );
          patches.push({
            label: defer.label,
            fields: patchFields,
          });
        } else {
          collectFieldsImpl(
            schema,
            fragments,
            variableValues,
            runtimeType,
            fragment.selectionSet,
            fields,
            patches,
            visitedFragmentNames,
            spreadVariableValues,
          );
        }
        break;
      }
    }
  }
}

/**
 * Given a selectionSet, collects all of the fields and returns them.
 *
 * CollectFields requires the "runtime type" of an object. For a field that
 * returns an Interface or Union type, the "runtime type" will be the actual
 * object type returned by that field.
 *
 */
export function collectFields<TVariables = any>(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: TVariables,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
): FieldsAndPatches {
  const fields = new AccumulatorMap<string, FieldDetails>();
  const patches: Array<PatchFields> = [];
  collectFieldsImpl(
    schema,
    fragments,
    variableValues,
    runtimeType,
    selectionSet,
    fields,
    patches,
    new Set(),
    undefined,
  );
  return { fields, patches };
}

/**
 * Determines if a field should be included based on the `@include` and `@skip`
 * directives, where `@skip` has higher precedence than `@include`.
 */
export function shouldIncludeNode(
  variableValues: any,
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
export function doesFragmentConditionMatch(
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
    const possibleTypes = schema.getPossibleTypes(conditionalType);
    return possibleTypes.includes(type);
  }
  return false;
}

/**
 * Implements the logic to compute the key of a given field's entry
 */
export function getFieldEntryKey(node: FieldNode): string {
  return node.alias ? node.alias.value : node.name.value;
}

/**
 * Returns an object containing the `@defer` arguments if a field should be
 * deferred based on the experimental flag, defer directive present and
 * not disabled by the "if" argument.
 */
export function getDeferValues(
  variableValues: any,
  node: FragmentSpreadNode | InlineFragmentNode,
): undefined | { label: string | undefined } {
  const defer = getDirectiveValues(GraphQLDeferDirective, node, variableValues);

  if (!defer) {
    return;
  }

  if (defer['if'] === false) {
    return;
  }

  return {
    label: typeof defer['label'] === 'string' ? defer['label'] : undefined,
  };
}

/**
 * Given an array of field nodes, collects all of the subfields of the passed
 * in fields, and returns them at the end.
 *
 * CollectSubFields requires the "return type" of an object. For a field that
 * returns an Interface or Union type, the "return type" will be the actual
 * object type returned by that field.
 *
 */
export const collectSubFields = memoize5(function collectSubfields(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: { [variable: string]: unknown },
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
): FieldsAndPatches {
  const subFieldNodes = new AccumulatorMap<string, FieldDetails>();
  const visitedFragmentNames = new Set<string>();

  const subPatches: Array<PatchFields> = [];
  const subFieldsAndPatches = {
    fields: subFieldNodes,
    patches: subPatches,
  };

  for (const node of fieldNodes) {
    if (node.selectionSet) {
      collectFieldsImpl(
        schema,
        fragments,
        variableValues,
        returnType,
        node.selectionSet,
        subFieldNodes,
        subPatches,
        visitedFragmentNames,
        undefined,
      );
    }
  }
  return subFieldsAndPatches;
});
