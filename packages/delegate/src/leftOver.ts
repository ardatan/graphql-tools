import { FieldNode } from 'graphql';
import { Deferred } from '@graphql-tools/utils';
import { Subschema } from './Subschema.js';
import { DelegationPlanBuilder, ExternalObject } from './types.js';

export interface DelegationPlanLeftOver {
  unproxiableFieldNodes: Array<FieldNode>;
  nonProxiableSubschemas: Array<Subschema>;
  missingFieldsParentMap: Map<ExternalObject, Array<FieldNode>>;
  missingFieldsParentDeferredMap: Map<ExternalObject, Map<string, Deferred>>;
}
export const leftOverByDelegationPlan = new WeakMap<
  ReturnType<DelegationPlanBuilder>,
  DelegationPlanLeftOver
>();
export const PLAN_LEFT_OVER = Symbol('PLAN_LEFT_OVER');
export function getPlanLeftOverFromParent(parent: unknown): DelegationPlanLeftOver | undefined {
  if (parent != null && typeof parent === 'object') {
    return parent[PLAN_LEFT_OVER];
  }
}
