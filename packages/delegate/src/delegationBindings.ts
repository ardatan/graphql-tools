import { Transform, DelegationContext } from './types';

import FilterToSchema from './transforms/FilterToSchema';
import AddTypenameToAbstract from './transforms/AddTypenameToAbstract';
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

  const args = delegationContext.args;
  if (args != null) {
    delegationTransforms.push(new FinalizeGatewayRequest(args));
  }

  delegationTransforms = delegationTransforms.concat([new AddTypenameToAbstract(), new FilterToSchema()]);

  return delegationTransforms;
}
