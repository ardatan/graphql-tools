import {
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  FieldDefinitionNode,
  getOperationAST,
  OperationTypeNode,
  OperationDefinitionNode,
  DocumentNode,
  GraphQLOutputType,
  GraphQLObjectType,
  GraphQLResolveInfo,
} from 'graphql';

import isPromise from 'is-promise';

import AggregateError from '@ardatan/aggregate-error';

import { getBatchingExecutor } from '@graphql-tools/batch-execute';

import { mapAsyncIterator, ExecutionResult, Executor, ExecutionParams } from '@graphql-tools/utils';

import { IDelegateToSchemaOptions, IDelegateRequestOptions, SubschemaConfig, StitchingInfo, Transform } from './types';

import { isSubschemaConfig } from './subschemaConfig';
import { Subschema } from './Subschema';
import { createRequestFromInfo, getDelegatingOperation } from './createRequest';
import { Transformer } from './Transformer';
import { memoize2 } from './memoize';

export function delegateToSchema<TContext = Record<string, any>, TArgs = any>(
  options: IDelegateToSchemaOptions<TContext, TArgs>
): any {
  const {
    info,
    operationName,
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
    operationName,
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
  targetSchema: GraphQLSchema,
  operation: OperationTypeNode,
  fieldName: string
): GraphQLOutputType {
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

export function delegateRequest<TContext = Record<string, any>, TArgs = any>({
  request,
  schema: subschemaOrSubschemaConfig,
  rootValue,
  info,
  operation,
  fieldName,
  args,
  returnType,
  onLocatedError,
  context,
  transforms = [],
  transformedSchema,
  skipValidation,
  skipTypeMerging,
  binding,
}: IDelegateRequestOptions<TContext, TArgs>) {
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

  const { targetSchema, targetRootValue, subschemaConfig, allTransforms } = collectTargetParameters(
    subschemaOrSubschemaConfig,
    rootValue,
    info,
    transforms
  );

  const delegationContext = {
    subschema: subschemaOrSubschemaConfig,
    targetSchema,
    operation: targetOperation,
    fieldName: targetFieldName,
    args,
    context,
    info,
    returnType:
      returnType ?? info?.returnType ?? getDelegationReturnType(targetSchema, targetOperation, targetFieldName),
    onLocatedError,
    transforms: allTransforms,
    transformedSchema: transformedSchema ?? (subschemaConfig as Subschema)?.transformedSchema ?? targetSchema,
    skipTypeMerging,
  };

  const transformer = new Transformer(delegationContext, binding);

  const processedRequest = transformer.transformRequest(request);

  if (!skipValidation) {
    validateRequest(targetSchema, processedRequest.document);
  }

  if (targetOperation === 'query' || targetOperation === 'mutation') {
    let executor: Executor =
      subschemaConfig?.executor || createDefaultExecutor(targetSchema, subschemaConfig?.rootValue || targetRootValue);

    if (subschemaConfig?.batch) {
      const batchingOptions = subschemaConfig?.batchingOptions;
      executor = getBatchingExecutor(
        context,
        executor,
        batchingOptions?.dataLoaderOptions,
        batchingOptions?.extensionsReducer
      );
    }

    const executionResult = executor({
      ...processedRequest,
      context,
      info,
    });

    if (isPromise(executionResult)) {
      return executionResult.then(originalResult => {
        return transformer.transformResult(originalResult);
      });
    }
    return transformer.transformResult(executionResult);
  }

  const subscriber =
    subschemaConfig?.subscriber || createDefaultSubscriber(targetSchema, subschemaConfig?.rootValue || targetRootValue);

  return subscriber({
    ...processedRequest,
    context,
    info,
  }).then((subscriptionResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => {
    if (Symbol.asyncIterator in subscriptionResult) {
      // "subscribe" to the subscription result and map the result through the transforms
      return mapAsyncIterator<ExecutionResult, any>(
        subscriptionResult as AsyncIterableIterator<ExecutionResult>,
        originalResult => ({
          [targetFieldName]: transformer.transformResult(originalResult),
        })
      );
    }

    return transformer.transformResult(subscriptionResult as ExecutionResult);
  });
}

const emptyObject = {};

function collectTargetParameters(
  subschema: GraphQLSchema | SubschemaConfig,
  rootValue: Record<string, any>,
  info: GraphQLResolveInfo,
  transforms: Array<Transform> = []
): {
  targetSchema: GraphQLSchema;
  targetRootValue: Record<string, any>;
  subschemaConfig?: SubschemaConfig;
  allTransforms: Array<Transform>;
} {
  const stitchingInfo: StitchingInfo = info?.schema.extensions?.stitchingInfo;

  const subschemaOrSubschemaConfig = stitchingInfo?.subschemaMap.get(subschema) ?? subschema;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    return {
      targetSchema: subschemaOrSubschemaConfig.schema,
      targetRootValue: rootValue ?? subschemaOrSubschemaConfig?.rootValue ?? info?.rootValue ?? emptyObject,
      subschemaConfig: subschemaOrSubschemaConfig,
      allTransforms:
        subschemaOrSubschemaConfig.transforms != null
          ? subschemaOrSubschemaConfig.transforms.concat(transforms)
          : transforms,
    };
  }

  return {
    targetSchema: subschemaOrSubschemaConfig,
    targetRootValue: rootValue ?? info?.rootValue ?? emptyObject,
    allTransforms: transforms,
  };
}

function validateRequest(targetSchema: GraphQLSchema, document: DocumentNode) {
  const errors = validate(targetSchema, document);
  if (errors.length > 0) {
    if (errors.length > 1) {
      const combinedError = new AggregateError(errors);
      throw combinedError;
    }
    const error = errors[0];
    throw error.originalError || error;
  }
}

const createDefaultExecutor = memoize2(function (schema: GraphQLSchema, rootValue: Record<string, any>): Executor {
  return (({ document, context, variables, info }: ExecutionParams) =>
    execute({
      schema,
      document,
      contextValue: context,
      variableValues: variables,
      rootValue: rootValue ?? info?.rootValue,
    })) as Executor;
});

function createDefaultSubscriber(schema: GraphQLSchema, rootValue: Record<string, any>) {
  return ({ document, context, variables, info }: ExecutionParams) =>
    subscribe({
      schema,
      document,
      contextValue: context,
      variableValues: variables,
      rootValue: rootValue ?? info?.rootValue,
    }) as any;
}
