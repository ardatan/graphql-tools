import {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  SelectionSetNode,
  Kind,
  GraphQLObjectType,
  getDirectiveValues,
  GraphQLSchema,
} from 'graphql';
import { doesFragmentConditionMatch, getFieldEntryKey, memoize5, shouldIncludeNode } from '@graphql-tools/utils';
import { AccumulatorMap } from './AccumulatorMap';
import { ObjMap } from './types';
import { GraphQLDeferDirective } from '../directives';

export interface PatchFields {
  label: string | undefined;
  fields: Map<string, ReadonlyArray<FieldNode>>;
}

export interface FieldsAndPatches {
  fields: Map<string, ReadonlyArray<FieldNode>>;
  patches: Array<PatchFields>;
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
export function collectFields(
  schema: GraphQLSchema,
  fragments: ObjMap<FragmentDefinitionNode>,
  variableValues: { [variable: string]: unknown },
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode
): FieldsAndPatches {
  const fields = new AccumulatorMap<string, FieldNode>();
  const patches: Array<PatchFields> = [];
  collectFieldsImpl(schema, fragments, variableValues, runtimeType, selectionSet, fields, patches, new Set());
  return { fields, patches };
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
export const collectSubfields = memoize5(function collectSubfields(
  schema: GraphQLSchema,
  fragments: ObjMap<FragmentDefinitionNode>,
  variableValues: { [variable: string]: unknown },
  returnType: GraphQLObjectType,
  fieldNodes: ReadonlyArray<FieldNode>
): FieldsAndPatches {
  const subFieldNodes = new AccumulatorMap<string, FieldNode>();
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
        visitedFragmentNames
      );
    }
  }
  return subFieldsAndPatches;
});

function collectFieldsImpl(
  schema: GraphQLSchema,
  fragments: ObjMap<FragmentDefinitionNode>,
  variableValues: { [variable: string]: unknown },
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
  fields: AccumulatorMap<string, FieldNode>,
  patches: Array<PatchFields>,
  visitedFragmentNames: Set<string>
): void {
  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case Kind.FIELD: {
        if (!shouldIncludeNode(variableValues, selection)) {
          continue;
        }
        fields.add(getFieldEntryKey(selection), selection);
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        if (
          !shouldIncludeNode(variableValues, selection) ||
          !doesFragmentConditionMatch(schema, selection, runtimeType)
        ) {
          continue;
        }

        const defer = getDeferValues(variableValues, selection);

        if (defer) {
          const patchFields = new AccumulatorMap<string, FieldNode>();
          collectFieldsImpl(
            schema,
            fragments,
            variableValues,
            runtimeType,
            selection.selectionSet,
            patchFields,
            patches,
            visitedFragmentNames
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
            visitedFragmentNames
          );
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragName = selection.name.value;

        if (!shouldIncludeNode(variableValues, selection)) {
          continue;
        }

        const defer = getDeferValues(variableValues, selection);
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

        if (defer) {
          const patchFields = new AccumulatorMap<string, FieldNode>();
          collectFieldsImpl(
            schema,
            fragments,
            variableValues,
            runtimeType,
            fragment.selectionSet,
            patchFields,
            patches,
            visitedFragmentNames
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
            visitedFragmentNames
          );
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
function getDeferValues(
  variableValues: { [variable: string]: unknown },
  node: FragmentSpreadNode | InlineFragmentNode
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
