import { Transform } from '@graphql-tools/utils';

import { StitchingInfo, DelegationContext } from './types';

import ExpandAbstractTypes from './transforms/ExpandAbstractTypes';
import WrapConcreteTypes from './transforms/WrapConcreteTypes';
import FilterToSchema from './transforms/FilterToSchema';
import AddFragmentsByField from './transforms/AddFragmentsByField';
import AddSelectionSetsByField from './transforms/AddSelectionSetsByField';
import AddSelectionSetsByType from './transforms/AddSelectionSetsByType';
import AddTypenameToAbstract from './transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from './transforms/CheckResultAndHandleErrors';
import AddArgumentsAsVariables from './transforms/AddArgumentsAsVariables';

export function defaultDelegationBinding(delegationContext: DelegationContext): Array<Transform> {
  const {
    subschema: schemaOrSubschemaConfig,
    targetSchema,
    fieldName,
    args,
    context,
    info,
    returnType,
    transforms = [],
    skipTypeMerging,
  } = delegationContext;
  const stitchingInfo: StitchingInfo = info?.schema.extensions?.stitchingInfo;

  let transformedSchema = stitchingInfo?.transformedSchemas.get(schemaOrSubschemaConfig);
  if (transformedSchema != null) {
    delegationContext.transformedSchema = transformedSchema;
  } else {
    transformedSchema = delegationContext.transformedSchema;
  }

  let delegationTransforms: Array<Transform> = [
    new CheckResultAndHandleErrors(info, fieldName, schemaOrSubschemaConfig, context, returnType, skipTypeMerging),
  ];

  if (stitchingInfo != null) {
    delegationTransforms = delegationTransforms.concat([
      new AddSelectionSetsByField(info.schema, stitchingInfo.selectionSetsByField),
      new AddSelectionSetsByType(info.schema, stitchingInfo.selectionSetsByType),
      new WrapConcreteTypes(returnType, transformedSchema),
      new ExpandAbstractTypes(info.schema, transformedSchema),
    ]);
  } else if (info != null) {
    delegationTransforms = delegationTransforms.concat([
      new WrapConcreteTypes(returnType, transformedSchema),
      new ExpandAbstractTypes(info.schema, transformedSchema),
    ]);
  } else {
    delegationTransforms.push(new WrapConcreteTypes(returnType, transformedSchema));
  }

  delegationTransforms = delegationTransforms.concat(transforms.slice().reverse());

  if (stitchingInfo != null) {
    delegationTransforms.push(new AddFragmentsByField(targetSchema, stitchingInfo.fragmentsByField));
  }

  if (args != null) {
    delegationTransforms.push(new AddArgumentsAsVariables(targetSchema, args));
  }

  delegationTransforms = delegationTransforms.concat([
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
  ]);

  return delegationTransforms;
}
