import {
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  ExecutionResult,
  GraphQLOutputType,
  isSchema,
  GraphQLResolveInfo,
  FieldDefinitionNode,
  getOperationAST,
  OperationTypeNode,
  GraphQLObjectType,
  OperationDefinitionNode,
} from 'graphql';

import {
  Transform,
  applyRequestTransforms,
  applyResultTransforms,
  mapAsyncIterator,
  CombinedError,
} from '@graphql-tools/utils';

import ExpandAbstractTypes from './transforms/ExpandAbstractTypes';
import WrapConcreteTypes from './transforms/WrapConcreteTypes';
import FilterToSchema from './transforms/FilterToSchema';
import AddReplacementSelectionSets from './transforms/AddReplacementSelectionSets';
import AddReplacementFragments from './transforms/AddReplacementFragments';
import AddMergedTypeSelectionSets from './transforms/AddMergedTypeSelectionSets';
import AddTypenameToAbstract from './transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from './transforms/CheckResultAndHandleErrors';
import AddArgumentsAsVariables from './transforms/AddArgumentsAsVariables';
import { createRequestFromInfo, getDelegatingOperation } from './createRequest';
import {
  IDelegateToSchemaOptions,
  IDelegateRequestOptions,
  SubschemaConfig,
  isSubschemaConfig,
  ExecutionParams,
  StitchingInfo,
} from './types';

export function delegateToSchema(options: IDelegateToSchemaOptions | GraphQLSchema): any {
  if (isSchema(options)) {
    throw new Error(
      'Passing positional arguments to delegateToSchema is deprecated. ' + 'Please pass named parameters instead.'
    );
  }

  const {
    info,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    returnType = info.returnType,
    selectionSet,
    fieldNodes,
  } = options;

  const request = createRequestFromInfo({
    info,
    operation,
    fieldName,
    selectionSet,
    fieldNodes,
  });

  return delegateRequest({
    ...options,
    request,
    operation,
    fieldName,
    returnType,
  });
}

function getDelegationReturnType(
  info: GraphQLResolveInfo,
  targetSchema: GraphQLSchema,
  operation: OperationTypeNode,
  fieldName: string
): GraphQLOutputType {
  if (info != null) {
    return info.returnType;
  }

  let rootType: GraphQLObjectType<any, any>;
  if (operation === 'query') {
    rootType = targetSchema.getQueryType();
  } else if (operation === 'mutation') {
    rootType = targetSchema.getMutationType();
  } else {
    rootType = targetSchema.getSubscriptionType();
  }

  return rootType.getFields()[fieldName].type;
}

function buildDelegationTransforms(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  info: GraphQLResolveInfo,
  context: Record<string, any>,
  targetSchema: GraphQLSchema,
  fieldName: string,
  args: Record<string, any>,
  returnType: GraphQLOutputType,
  transforms: Array<Transform>,
  transformedSchema: GraphQLSchema,
  skipTypeMerging: boolean
): Array<Transform> {
  const stitchingInfo: StitchingInfo = info?.schema.extensions?.stitchingInfo;

  let delegationTransforms: Array<Transform> = [
    new CheckResultAndHandleErrors(info, fieldName, subschemaOrSubschemaConfig, context, returnType, skipTypeMerging),
  ];

  if (stitchingInfo != null) {
    delegationTransforms.push(
      new AddReplacementSelectionSets(info.schema, stitchingInfo.replacementSelectionSets),
      new AddMergedTypeSelectionSets(info.schema, stitchingInfo.mergedTypes)
    );
  }

  const transformedTargetSchema =
    stitchingInfo == null
      ? transformedSchema ?? targetSchema
      : transformedSchema ?? stitchingInfo.transformedSchemas.get(subschemaOrSubschemaConfig) ?? targetSchema;

  delegationTransforms.push(new WrapConcreteTypes(returnType, transformedTargetSchema));

  if (info != null) {
    delegationTransforms.push(new ExpandAbstractTypes(info.schema, transformedTargetSchema));
  }

  delegationTransforms = delegationTransforms.concat(transforms);

  if (stitchingInfo != null) {
    delegationTransforms.push(new AddReplacementFragments(targetSchema, stitchingInfo.replacementFragments));
  }

  if (args != null) {
    delegationTransforms.push(new AddArgumentsAsVariables(targetSchema, args));
  }

  delegationTransforms.push(new FilterToSchema(targetSchema), new AddTypenameToAbstract(targetSchema));

  return delegationTransforms;
}

export function delegateRequest({
  request,
  schema: subschemaOrSubschemaConfig,
  rootValue,
  info,
  operation,
  fieldName,
  args,
  returnType,
  context,
  transforms = [],
  transformedSchema,
  skipValidation,
  skipTypeMerging,
}: IDelegateRequestOptions) {
  let operationDefinition: OperationDefinitionNode;
  let targetOperation: OperationTypeNode;
  let targetFieldName: string;

  if (operation == null) {
    operationDefinition = getOperationAST(request.document, undefined);
    targetOperation = operationDefinition.operation;
  } else {
    targetOperation = operation;
  }

  if (fieldName == null) {
    operationDefinition = operationDefinition ?? getOperationAST(request.document, undefined);
    targetFieldName = ((operationDefinition.selectionSet.selections[0] as unknown) as FieldDefinitionNode).name.value;
  } else {
    targetFieldName = fieldName;
  }

  let targetSchema: GraphQLSchema;
  let targetRootValue: Record<string, any>;
  let requestTransforms: Array<Transform> = transforms.slice();
  let subschemaConfig: SubschemaConfig;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    subschemaConfig = subschemaOrSubschemaConfig;
    targetSchema = subschemaConfig.schema;
    targetRootValue = rootValue ?? subschemaConfig?.rootValue ?? info?.rootValue;
    if (subschemaConfig.transforms != null) {
      requestTransforms = requestTransforms.concat(subschemaConfig.transforms);
    }
  } else {
    targetSchema = subschemaOrSubschemaConfig;
    targetRootValue = rootValue ?? info?.rootValue;
  }

  const delegationTransforms = buildDelegationTransforms(
    subschemaOrSubschemaConfig,
    info,
    context,
    targetSchema,
    targetFieldName,
    args,
    returnType ?? getDelegationReturnType(info, targetSchema, targetOperation, targetFieldName),
    requestTransforms.reverse(),
    transformedSchema,
    skipTypeMerging
  );

  const processedRequest = applyRequestTransforms(request, delegationTransforms);

  if (!skipValidation) {
    const errors = validate(targetSchema, processedRequest.document);
    if (errors.length > 0) {
      if (errors.length > 1) {
        const combinedError = new CombinedError(errors);
        throw combinedError;
      }
      const error = errors[0];
      throw error.originalError || error;
    }
  }

  if (targetOperation === 'query' || targetOperation === 'mutation') {
    const executor =
      subschemaConfig?.executor || createDefaultExecutor(targetSchema, subschemaConfig?.rootValue || targetRootValue);

    const executionResult = executor({
      document: processedRequest.document,
      variables: processedRequest.variables,
      context,
      info,
    });

    if (executionResult instanceof Promise) {
      return executionResult.then((originalResult: any) => applyResultTransforms(originalResult, delegationTransforms));
    }
    return applyResultTransforms(executionResult, delegationTransforms);
  }

  const subscriber =
    subschemaConfig?.subscriber || createDefaultSubscriber(targetSchema, subschemaConfig?.rootValue || targetRootValue);

  return subscriber({
    document: processedRequest.document,
    variables: processedRequest.variables,
    context,
    info,
  }).then((subscriptionResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => {
    if (Symbol.asyncIterator in subscriptionResult) {
      // "subscribe" to the subscription result and map the result through the transforms
      return mapAsyncIterator<ExecutionResult, any>(
        subscriptionResult as AsyncIterableIterator<ExecutionResult>,
        result => {
          const transformedResult = applyResultTransforms(result, delegationTransforms);
          // wrap with fieldName to return for an additional round of resolutioon
          // with payload as rootValue
          return {
            [targetFieldName]: transformedResult,
          };
        }
      );
    }

    return applyResultTransforms(subscriptionResult, delegationTransforms);
  });
}

function createDefaultExecutor(schema: GraphQLSchema, rootValue: Record<string, any>) {
  return ({ document, context, variables, info }: ExecutionParams) =>
    execute(schema, document, rootValue ?? info?.rootValue, context, variables);
}

function createDefaultSubscriber(schema: GraphQLSchema, rootValue: Record<string, any>) {
  return ({ document, context, variables, info }: ExecutionParams) =>
    subscribe(schema, document, rootValue ?? info?.rootValue, context, variables) as any;
}
