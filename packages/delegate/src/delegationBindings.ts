import { Transform, DelegationContext } from './types';

import CheckResultAndHandleErrors from './transforms/CheckResultAndHandleErrors';
import FinalizeGatewayRequest from './transforms/FinalizeGatewayRequest';

export function defaultDelegationBinding<TContext>(
  delegationContext: DelegationContext<TContext>
): Array<Transform<any, TContext>> {
  let delegationTransforms: Array<Transform<any, TContext>> = [new CheckResultAndHandleErrors()];

  const transforms = delegationContext.transforms;
  if (transforms != null) {
    delegationTransforms = delegationTransforms.concat(transforms.slice().reverse());
  }

  delegationTransforms.push(new FinalizeGatewayRequest());

  return delegationTransforms;
}
