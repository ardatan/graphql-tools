import { GraphQLResolveInfo, print, responsePathAsArray, SelectionSetNode } from 'graphql';
import { memoize2of5 } from '@graphql-tools/utils';
import { Subschema } from './Subschema.js';
import { MergedTypeInfo } from './types.js';

export interface DelegationPlanInfo {
  contextId?: string;
  operationName?: string;
  planId: string;
  source?: string;
  type?: string;
  path: (string | number)[];
  fieldNodes?: string[];
  fragments: string[];
  stages: {
    stageId: string;
    delegations: {
      target?: string;
      selectionSet: string;
    }[];
  }[];
}

export const delegationPlanIdMap = new WeakMap<
  Map<Subschema<any, any, any, Record<string, any>>, SelectionSetNode>[],
  string
>();
export const delegationStageIdMap = new WeakMap<
  Map<Subschema<any, any, any, Record<string, any>>, SelectionSetNode>,
  string
>();
export const logFnForContext = new WeakMap<any, (data: any) => void>();
export const delegationPlanInfosByContext = new WeakMap<any, Set<DelegationPlanInfo>>();
export const contextIdMap = new WeakMap<any, string>();
export function isDelegationDebugging() {
  return globalThis.process?.env['EXPOSE_DELEGATION_PLAN'];
}

export const getDelegationInfo = memoize2of5(function getDelegationInfo(
  context: any,
  delegationMaps: Map<Subschema<any, any, any, any>, SelectionSetNode>[],
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschema: Subschema<any, any, any, any>,
  info: GraphQLResolveInfo,
): DelegationPlanInfo {
  return {
    contextId: contextIdMap.get(context),
    operationName: info.operation.name?.value,
    planId: delegationPlanIdMap.get(delegationMaps)!,
    source: sourceSubschema.name,
    type: mergedTypeInfo.typeName,
    path: responsePathAsArray(info.path).filter(key => typeof key === 'string'),
    fieldNodes: info.fieldNodes?.map(print),
    fragments: Object.values(info.fragments || {}).map(fragmentNode => `${print(fragmentNode)}`),
    stages: delegationMaps.map(delegationMap => ({
      stageId: delegationStageIdMap.get(delegationMap)!,
      delegations: Array.from(delegationMap).map(([subschema, selectionSet]) => ({
        target: subschema.name,
        selectionSet: print(selectionSet),
      })),
    })),
  };
});
