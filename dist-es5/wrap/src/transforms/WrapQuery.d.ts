import { SelectionNode, SelectionSetNode } from 'graphql';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { Transform, DelegationContext } from '@graphql-tools/delegate';
export declare type QueryWrapper = (subtree: SelectionSetNode) => SelectionNode | SelectionSetNode;
export default class WrapQuery implements Transform {
  private readonly wrapper;
  private readonly extractor;
  private readonly path;
  constructor(path: Array<string>, wrapper: QueryWrapper, extractor: (result: any) => any);
  transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionRequest;
  transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionResult;
}
