import { SelectionSetNode } from 'graphql';
import { Subschema } from './Subschema.js';

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
