import { AccumulatorMap } from './AccumulatorMap.js';
import type { DeferUsage, FieldDetails, FieldGroup, GroupedFieldSet } from './collectFields.js';
import { getBySet } from './getBySet.js';
import { isSameSet } from './isSameSet.js';

export type DeferUsageSet = ReadonlySet<DeferUsage>;

export interface ExecutionPlan {
  groupedFieldSet: GroupedFieldSet;
  newGroupedFieldSets: Map<DeferUsageSet, GroupedFieldSet>;
}

export function buildExecutionPlan(
  originalGroupedFieldSet: GroupedFieldSet,
  parentDeferUsages: DeferUsageSet = new Set<DeferUsage>(),
): ExecutionPlan {
  const groupedFieldSet = new Map<string, FieldGroup>();
  const newGroupedFieldSets = new Map<DeferUsageSet, Map<string, FieldGroup>>();
  for (const [responseKey, fieldGroup] of originalGroupedFieldSet) {
    const filteredDeferUsageSet = getFilteredDeferUsageSet(fieldGroup);

    if (isSameSet(filteredDeferUsageSet, parentDeferUsages)) {
      groupedFieldSet.set(responseKey, fieldGroup);
      continue;
    }

    let newGroupedFieldSet = getBySet(newGroupedFieldSets, filteredDeferUsageSet);
    if (newGroupedFieldSet === undefined) {
      newGroupedFieldSet = new Map();
      newGroupedFieldSets.set(filteredDeferUsageSet, newGroupedFieldSet);
    }
    newGroupedFieldSet.set(responseKey, fieldGroup);
  }

  return {
    groupedFieldSet,
    newGroupedFieldSets,
  };
}

function getFilteredDeferUsageSet(fieldGroup: FieldGroup): ReadonlySet<DeferUsage> {
  const filteredDeferUsageSet = new Set<DeferUsage>();
  for (const fieldDetails of fieldGroup) {
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

export function buildBranchingExecutionPlan(
  originalGroupedFieldSet: GroupedFieldSet,
  parentDeferUsages: DeferUsageSet = new Set<DeferUsage>(),
): ExecutionPlan {
  const groupedFieldSet = new AccumulatorMap<string, FieldDetails>();

  const newGroupedFieldSets = new Map<DeferUsageSet, AccumulatorMap<string, FieldDetails>>();

  for (const [responseKey, fieldGroup] of originalGroupedFieldSet) {
    for (const fieldDetails of fieldGroup) {
      const deferUsage = fieldDetails.deferUsage;
      const deferUsageSet =
        deferUsage === undefined ? new Set<DeferUsage>() : new Set([deferUsage]);
      if (isSameSet(parentDeferUsages, deferUsageSet)) {
        groupedFieldSet.add(responseKey, fieldDetails);
      } else {
        let newGroupedFieldSet = getBySet(newGroupedFieldSets, deferUsageSet);
        if (newGroupedFieldSet === undefined) {
          newGroupedFieldSet = new AccumulatorMap();
          newGroupedFieldSets.set(deferUsageSet, newGroupedFieldSet);
        }
        newGroupedFieldSet.add(responseKey, fieldDetails);
      }
    }
  }

  return {
    groupedFieldSet,
    newGroupedFieldSets,
  };
}
