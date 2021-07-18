import { Maybe } from '@graphql-tools/utils';
import { Transform, StitchingInfo, DelegationContext } from './types';

import AddSelectionSets from './transforms/AddSelectionSets';
import FilterToSchema from './transforms/FilterToSchema';
import AddTypenameToAbstract from './transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from './transforms/CheckResultAndHandleErrors';
import AddArgumentsAsVariables from './transforms/AddArgumentsAsVariables';
import PrepareGatewayRequest from './transforms/PrepareGatewayRequest';

export function defaultDelegationBinding<TContext>(
  delegationContext: DelegationContext<TContext>
): Array<Transform<any, TContext>> {
  let delegationTransforms: Array<Transform<any, TContext>> = [new CheckResultAndHandleErrors()];

  const info = delegationContext.info;
  const stitchingInfo: Maybe<StitchingInfo> = info?.schema.extensions?.['stitchingInfo'];

  delegationTransforms.push(new PrepareGatewayRequest());

  if (stitchingInfo != null) {
    delegationTransforms = delegationTransforms.concat([
      new AddSelectionSets(
        stitchingInfo.fieldNodesByType,
        stitchingInfo.fieldNodesByField,
        stitchingInfo.dynamicSelectionSetsByField
      ),
    ]);
  }

  const transforms = delegationContext.transforms;
  if (transforms != null) {
    delegationTransforms = delegationTransforms.concat(transforms.slice().reverse());
  }

  const args = delegationContext.args;
  if (args != null) {
    delegationTransforms.push(new AddArgumentsAsVariables(args));
  }

  delegationTransforms = delegationTransforms.concat([new AddTypenameToAbstract(), new FilterToSchema()]);

  return delegationTransforms;
}
