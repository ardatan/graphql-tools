import {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLObjectType,
  GraphQLSchema,
  InlineFragmentNode,
  Kind,
  SelectionSetNode,
} from 'graphql';
import {
  doesFragmentConditionMatch,
  getDirectiveValues,
  getFieldEntryKey,
  GraphQLDeferDirective,
  shouldIncludeNode,
  type VariableValues,
} from '@graphql-tools/utils';
import { getBySet } from './getBySet.js';
import { isSameSet } from './isSameSet.js';

/**
 * graphql-js 17 DeferUsage: a @defer selection and its parent chain.
 * Overlapping fields keep one FieldDetails without deferUsage so they execute
 * in the parent group instead of again in the deferred patch.
 */
export interface DeferUsage {
  label: string | undefined;
  parentDeferUsage: DeferUsage | undefined;
}

export interface FieldDetails {
  node: FieldNode;
  deferUsage?: DeferUsage;
}

export type FieldDetailsList = ReadonlyArray<FieldDetails>;
export type GroupedFieldSet = ReadonlyMap<string, FieldDetailsList>;
export type DeferUsageSet = ReadonlySet<DeferUsage>;

export interface ExecutionPlan {
  groupedFieldSet: GroupedFieldSet;
  newGroupedFieldSets: Map<DeferUsageSet, GroupedFieldSet>;
}

class FieldDetailsMap extends Map<string, Array<FieldDetails>> {
  add(key: string, item: FieldDetails): void {
    const group = this.get(key);
    if (group === undefined) {
      this.set(key, [item]);
    } else {
      group.push(item);
    }
  }
}

interface CollectFieldsContext {
  schema: GraphQLSchema;
  fragments: Record<string, FragmentDefinitionNode>;
  variableValues: VariableValues;
  runtimeType: GraphQLObjectType;
  visitedFragmentNames: Map<string, boolean>;
}

export function collectIncrementalFields(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: VariableValues,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
  parentDeferUsage?: DeferUsage,
): {
  groupedFieldSet: GroupedFieldSet;
  newDeferUsages: ReadonlyArray<DeferUsage>;
} {
  const groupedFieldSet = new FieldDetailsMap();
  const newDeferUsages: Array<DeferUsage> = [];
  const context: CollectFieldsContext = {
    schema,
    fragments,
    variableValues,
    runtimeType,
    visitedFragmentNames: new Map(),
  };
  collectFieldsImpl(context, selectionSet, groupedFieldSet, newDeferUsages, parentDeferUsage);
  return { groupedFieldSet, newDeferUsages };
}

export function collectIncrementalSubfields(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: VariableValues,
  returnType: GraphQLObjectType,
  fieldNodes: ReadonlyArray<FieldNode>,
  parentDeferUsage?: DeferUsage,
): {
  groupedFieldSet: GroupedFieldSet;
  newDeferUsages: ReadonlyArray<DeferUsage>;
} {
  const groupedFieldSet = new FieldDetailsMap();
  const newDeferUsages: Array<DeferUsage> = [];
  const context: CollectFieldsContext = {
    schema,
    fragments,
    variableValues,
    runtimeType: returnType,
    visitedFragmentNames: new Map(),
  };
  for (const node of fieldNodes) {
    if (node.selectionSet) {
      collectFieldsImpl(
        context,
        node.selectionSet,
        groupedFieldSet,
        newDeferUsages,
        parentDeferUsage,
      );
    }
  }
  return { groupedFieldSet, newDeferUsages };
}

function collectFieldsImpl(
  context: CollectFieldsContext,
  selectionSet: SelectionSetNode,
  groupedFieldSet: FieldDetailsMap,
  newDeferUsages: Array<DeferUsage>,
  deferUsage?: DeferUsage,
): void {
  const { schema, fragments, variableValues, runtimeType, visitedFragmentNames } = context;

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
        const newDeferUsage = getDeferUsage(variableValues, selection, deferUsage);
        if (!newDeferUsage) {
          collectFieldsImpl(
            context,
            selection.selectionSet,
            groupedFieldSet,
            newDeferUsages,
            deferUsage,
          );
        } else {
          newDeferUsages.push(newDeferUsage);
          collectFieldsImpl(
            context,
            selection.selectionSet,
            groupedFieldSet,
            newDeferUsages,
            newDeferUsage,
          );
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragName = selection.name.value;
        if (!shouldIncludeNode(variableValues, selection)) {
          continue;
        }
        const fragment = fragments[fragName];
        if (!fragment || !doesFragmentConditionMatch(schema, fragment, runtimeType)) {
          continue;
        }
        const newDeferUsage = getDeferUsage(variableValues, selection, deferUsage);
        const visitedAsDeferred = visitedFragmentNames.get(fragName);
        let maybeNewDeferUsage: DeferUsage | undefined;
        if (!newDeferUsage) {
          if (visitedAsDeferred === false) {
            continue;
          }
          visitedFragmentNames.set(fragName, false);
          maybeNewDeferUsage = deferUsage;
        } else {
          if (visitedAsDeferred !== undefined) {
            continue;
          }
          visitedFragmentNames.set(fragName, true);
          newDeferUsages.push(newDeferUsage);
          maybeNewDeferUsage = newDeferUsage;
        }
        collectFieldsImpl(
          context,
          fragment.selectionSet,
          groupedFieldSet,
          newDeferUsages,
          maybeNewDeferUsage,
        );
        break;
      }
    }
  }
}

function getDeferUsage(
  variableValues: VariableValues,
  node: FragmentSpreadNode | InlineFragmentNode,
  parentDeferUsage: DeferUsage | undefined,
): DeferUsage | undefined {
  const defer = getDirectiveValues(GraphQLDeferDirective, node, variableValues);
  if (!defer || defer['if'] === false) {
    return;
  }
  return {
    label: typeof defer['label'] === 'string' ? defer['label'] : undefined,
    parentDeferUsage,
  };
}

export function buildExecutionPlan(
  originalGroupedFieldSet: GroupedFieldSet,
  parentDeferUsages: DeferUsageSet = new Set<DeferUsage>(),
): ExecutionPlan {
  const groupedFieldSet = new Map<string, FieldDetailsList>();
  const newGroupedFieldSets = new Map<DeferUsageSet, Map<string, FieldDetailsList>>();
  for (const [responseKey, fieldDetailsList] of originalGroupedFieldSet) {
    const filteredDeferUsageSet = getFilteredDeferUsageSet(fieldDetailsList);
    if (isSameSet(filteredDeferUsageSet, parentDeferUsages)) {
      groupedFieldSet.set(responseKey, fieldDetailsList);
      continue;
    }
    let newGroupedFieldSet = getBySet(newGroupedFieldSets, filteredDeferUsageSet);
    if (newGroupedFieldSet === undefined) {
      newGroupedFieldSet = new Map();
      newGroupedFieldSets.set(filteredDeferUsageSet, newGroupedFieldSet);
    }
    newGroupedFieldSet.set(responseKey, fieldDetailsList);
  }
  return { groupedFieldSet, newGroupedFieldSets };
}

function getFilteredDeferUsageSet(fieldDetailsList: FieldDetailsList): ReadonlySet<DeferUsage> {
  const filteredDeferUsageSet = new Set<DeferUsage>();
  for (const fieldDetails of fieldDetailsList) {
    const deferUsage = fieldDetails.deferUsage;
    if (deferUsage === undefined) {
      filteredDeferUsageSet.clear();
      return filteredDeferUsageSet;
    }
    filteredDeferUsageSet.add(deferUsage);
  }
  for (const deferUsage of filteredDeferUsageSet) {
    let parentDeferUsage: DeferUsage | undefined = deferUsage.parentDeferUsage;
    while (parentDeferUsage !== undefined) {
      if (filteredDeferUsageSet.has(parentDeferUsage)) {
        filteredDeferUsageSet.delete(deferUsage);
        break;
      }
      parentDeferUsage = parentDeferUsage.parentDeferUsage;
    }
  }
  return filteredDeferUsageSet;
}

export function groupedFieldSetToFieldMap(
  groupedFieldSet: GroupedFieldSet,
): Map<string, Array<FieldNode>> {
  const fields = new Map<string, Array<FieldNode>>();
  for (const [responseKey, fieldDetailsList] of groupedFieldSet) {
    fields.set(
      responseKey,
      fieldDetailsList.map(details => details.node),
    );
  }
  return fields;
}

export function rootDeferUsage(deferUsageSet: DeferUsageSet): DeferUsage | undefined {
  for (const usage of deferUsageSet) {
    if (usage.parentDeferUsage == null || !deferUsageSet.has(usage.parentDeferUsage)) {
      return usage;
    }
  }
  return undefined;
}

export function labelForDeferUsageSet(deferUsageSet: DeferUsageSet): string | undefined {
  return rootDeferUsage(deferUsageSet)?.label;
}
