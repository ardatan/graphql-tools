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
} from 'graphql';

import { ValueOrPromise } from 'value-or-promise';

import AggregateError from '@ardatan/aggregate-error';

import { getBatchingExecutor } from '@graphql-tools/batch-execute';

import { mapAsyncIterator, ExecutionResult, Executor, ExecutionParams, Subscriber } from '@graphql-tools/utils';

import { IDelegateToSchemaOptions, IDelegateRequestOptions, StitchingInfo, DelegationContext } from './types';

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

export function delegateRequest<TContext = Record<string, any>, TArgs = any>(options: IDelegateRequestOptions<TContext, TArgs>) {
  const delegationContext = getDelegationContext(options);

  const transformer = new Transformer(delegationContext, options.binding);

  const processedRequest = transformer.transformRequest(options.request);

  if (!options.skipValidation) {
    validateRequest(delegationContext, processedRequest.document);
  }

  const { operation, context, info } = delegationContext;

  if (operation === 'query' || operation === 'mutation') {
    const executor = getExecutor(delegationContext);

    return new ValueOrPromise(() => executor({
      ...processedRequest,
      context,
      info,
    })).then(originalResult => transformer.transformResult(originalResult)).resolve();
  }

  const subscriber = getSubscriber(delegationContext);

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
          [delegationContext.fieldName]: transformer.transformResult(originalResult),
        })
      );
    }

    return transformer.transformResult(subscriptionResult as ExecutionResult);
  });
}

const emptyObject = {};

function getDelegationContext({
  request,
  schema,
  operation,
  fieldName,
  returnType,
  args,
  context,
  info,
  rootValue,
  transforms = [],
  transformedSchema,
  skipTypeMerging,
}: IDelegateRequestOptions): DelegationContext {
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

  const stitchingInfo: StitchingInfo = info?.schema.extensions?.stitchingInfo;

  const subschemaOrSubschemaConfig = stitchingInfo?.subschemaMap.get(schema) ?? schema;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    const targetSchema = subschemaOrSubschemaConfig.schema;
    return {
      subschema: schema,
      subschemaConfig: subschemaOrSubschemaConfig,
      targetSchema,
      operation: targetOperation,
      fieldName: targetFieldName,
      args,
      context,
      info,
      rootValue: rootValue ?? subschemaOrSubschemaConfig?.rootValue ?? info?.rootValue ?? emptyObject,
      returnType: returnType ?? info?.returnType ?? getDelegationReturnType(targetSchema, targetOperation, targetFieldName),
      transforms:
        subschemaOrSubschemaConfig.transforms != null
          ? subschemaOrSubschemaConfig.transforms.concat(transforms)
          : transforms,
      transformedSchema: transformedSchema ?? (subschemaOrSubschemaConfig as Subschema)?.transformedSchema ?? targetSchema,
      skipTypeMerging,
    };
  }

  return {
    subschema: schema,
    subschemaConfig: undefined,
    targetSchema: subschemaOrSubschemaConfig,
    operation: targetOperation,
    fieldName: targetFieldName,
    args,
    context,
    info,
    rootValue: rootValue ?? info?.rootValue ?? emptyObject,
    returnType: returnType ?? info?.returnType ?? getDelegationReturnType(subschemaOrSubschemaConfig, targetOperation, targetFieldName),
    transforms,
    transformedSchema: transformedSchema ?? subschemaOrSubschemaConfig,
    skipTypeMerging,
  };
}

function validateRequest(delegationContext: DelegationContext, document: DocumentNode) {
  const errors = validate(delegationContext.targetSchema, document);
  if (errors.length > 0) {
    if (errors.length > 1) {
      const combinedError = new AggregateError(errors);
      throw combinedError;
    }
    const error = errors[0];
    throw error.originalError || error;
  }
}

function getExecutor(delegationContext: DelegationContext): Executor {
  const { subschemaConfig, targetSchema, context, rootValue } = delegationContext;

  let executor: Executor =
    subschemaConfig?.executor || createDefaultExecutor(targetSchema, subschemaConfig?.rootValue || rootValue);

  if (subschemaConfig?.batch) {
    const batchingOptions = subschemaConfig?.batchingOptions;
    executor = getBatchingExecutor(
      context,
      executor,
      batchingOptions?.dataLoaderOptions,
      batchingOptions?.extensionsReducer
    );
  }

  return executor;
}

function getSubscriber(delegationContext: DelegationContext): Subscriber {
  const { subschemaConfig, targetSchema, rootValue } = delegationContext;
  return subschemaConfig?.subscriber || createDefaultSubscriber(targetSchema, subschemaConfig?.rootValue || rootValue);
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
