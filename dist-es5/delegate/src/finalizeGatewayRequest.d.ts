import { ExecutionRequest } from '@graphql-tools/utils';
import { DelegationContext } from './types';
export declare function finalizeGatewayRequest(
  originalRequest: ExecutionRequest,
  delegationContext: DelegationContext
): ExecutionRequest;
