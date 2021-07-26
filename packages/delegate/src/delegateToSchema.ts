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
  ExecutionArgs,
  GraphQLError,
  isSchema,
} from 'graphql';

import { ValueOrPromise } from 'value-or-promise';

import { getBatchingExecutor } from '@graphql-tools/batch-execute';

import {
  mapAsyncIterator,
  Executor,
  ExecutionRequest,
  Maybe,
  AggregateError,
  isAsyncIterable,
  getDefinedRootType,
  memoize1,
} from '@graphql-tools/utils';

import {
  IDelegateToSchemaOptions,
  IDelegateRequestOptions,
  StitchingInfo,
  DelegationContext,
  SubschemaConfig,
} from './types';

import { Subschema } from './Subschema';
import { createRequestFromInfo, getDelegatingOperation } from './createRequest';
import { Transformer } from './Transformer';
import { externalValueFromResult } from './externalValues';

export function delegateToSchema<TContext = Record<string, any>, TArgs = any>(
  options: IDelegateToSchemaOptions<TContext, TArgs>
): any {
  const {
    info,
    schema,
    rootValue = (schema as SubschemaConfig).rootValue,
    operationName,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    selectionSet,
    fieldNodes,
    context,
  } = options;

  const request = createRequestFromInfo({
    info,
    operation,
    fieldName,
    selectionSet,
    fieldNodes,
    rootValue,
    operationName,
    context,
  });

  return delegateRequest({
    ...options,
    request,
    operation,
    fieldName,
  });
}

function getDelegationReturnType(
  targetSchema: GraphQLSchema,
  operation: OperationTypeNode,
  fieldName: string
): GraphQLOutputType {
  const rootType = getDefinedRootType(targetSchema, operation);
  return rootType.getFields()[fieldName].type;
}

export function delegateRequest<TContext = Record<string, any>, TArgs = any>(
  options: IDelegateRequestOptions<TContext, TArgs>
) {
  let operationDefinition: Maybe<OperationDefinitionNode>;
  let targetFieldName: string;

  const { document, operationName } = options.request;
  if (options.fieldName == null) {
    operationDefinition = getOperationAST(document, operationName);
    if (operationDefinition == null) {
      throw new Error('Cannot infer main operation from the provided document.');
    }
    targetFieldName = (operationDefinition?.selectionSet.selections[0] as unknown as FieldDefinitionNode).name.value;
  } else {
    targetFieldName = options.fieldName;
  }

  const {
    schema,
    info,
    operation = getDelegatingOperation(info.parentType, info.schema),
    returnType = info?.returnType ??
      getDelegationReturnType(schema instanceof GraphQLSchema ? schema : schema.schema, operation, targetFieldName),
    context,
    onLocatedError = (error: GraphQLError) => error,
    validateRequest: shouldValidateRequest,
  } = options;

  const delegationContext = getDelegationContext({
    ...options,
    operation,
    fieldName: targetFieldName,
    returnType,
  });

  const transformer = new Transformer<TContext>(delegationContext);

  const processedRequest = transformer.transformRequest(options.request);

  if (shouldValidateRequest) {
    validateRequest(delegationContext, processedRequest.document);
  }

  const executor = getExecutor(delegationContext);

  return new ValueOrPromise(() => executor(processedRequest))
    .then(originalResult => {
      if (isAsyncIterable(originalResult)) {
        // "subscribe" to the subscription result and map the result through the transforms
        return mapAsyncIterator(originalResult, result =>
          externalValueFromResult({
            result: transformer.transformResult(result),
            schema,
            info,
            context,
            fieldName: targetFieldName,
            returnType,
            onLocatedError,
          })
        );
      }
      return externalValueFromResult({
        result: transformer.transformResult(originalResult),
        schema,
        info,
        context,
        fieldName: targetFieldName,
        returnType,
        onLocatedError,
      });
    })
    .resolve();
}

export function getDelegationContext<TContext>({
  request,
  schema,
  fieldName,
  returnType,
  args,
  info,
  transforms = [],
  transformedSchema,
}: IDelegateRequestOptions<TContext>): DelegationContext<TContext> {
  const { operationType: operation, context, operationName, document } = request;
  let operationDefinition: Maybe<OperationDefinitionNode>;
  let targetFieldName: string;

  if (fieldName == null) {
    operationDefinition = getOperationAST(document, operationName);
    if (operationDefinition == null) {
      throw new Error('Cannot infer main operation from the provided document.');
    }
    targetFieldName = (operationDefinition?.selectionSet.selections[0] as unknown as FieldDefinitionNode).name.value;
  } else {
    targetFieldName = fieldName;
  }

  const stitchingInfo = info?.schema.extensions?.['stitchingInfo'] as Maybe<StitchingInfo<TContext>>;

  const subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig<any, any, any, any> =
    stitchingInfo?.subschemaMap.get(schema) ?? schema;

  if (!isSchema(subschemaOrSubschemaConfig)) {
    const targetSchema = subschemaOrSubschemaConfig.schema;
    return {
      subschema: schema,
      subschemaConfig: subschemaOrSubschemaConfig,
      targetSchema,
      operation,
      fieldName: targetFieldName,
      args,
      context,
      info,
      returnType: returnType ?? info?.returnType ?? getDelegationReturnType(targetSchema, operation, targetFieldName),
      transforms:
        subschemaOrSubschemaConfig.transforms != null
          ? subschemaOrSubschemaConfig.transforms.concat(transforms)
          : transforms,
      transformedSchema:
        transformedSchema ??
        (subschemaOrSubschemaConfig instanceof Subschema ? subschemaOrSubschemaConfig.transformedSchema : targetSchema),
    };
  }

  return {
    subschema: schema,
    subschemaConfig: undefined,
    targetSchema: subschemaOrSubschemaConfig,
    operation,
    fieldName: targetFieldName,
    args,
    context,
    info,
    returnType:
      returnType ?? info?.returnType ?? getDelegationReturnType(subschemaOrSubschemaConfig, operation, targetFieldName),
    transforms,
    transformedSchema: transformedSchema ?? subschemaOrSubschemaConfig,
  };
}

export function validateRequest(delegationContext: DelegationContext<any>, document: DocumentNode) {
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

export function getExecutor<TContext>(delegationContext: DelegationContext<TContext>): Executor<TContext> {
  const { subschemaConfig, targetSchema, context } = delegationContext;

  let executor: Executor = subschemaConfig?.executor || createDefaultExecutor(targetSchema);

  if (subschemaConfig?.batch) {
    const batchingOptions = subschemaConfig?.batchingOptions;
    executor = getBatchingExecutor(
      context ?? globalThis ?? window ?? global,
      executor,
      batchingOptions?.dataLoaderOptions,
      batchingOptions?.extensionsReducer
    );
  }

  return executor;
}

export const createDefaultExecutor = memoize1(function createDefaultExecutor(schema: GraphQLSchema): Executor {
  return function defaultExecutor({
    document,
    context,
    variables,
    rootValue,
    operationName,
    operationType,
  }: ExecutionRequest) {
    const executionArgs: ExecutionArgs = {
      schema,
      document,
      contextValue: context,
      variableValues: variables,
      rootValue,
      operationName,
    };
    if (operationType === 'subscription') {
      return subscribe(executionArgs);
    }
    return execute(executionArgs);
  } as Executor;
});
