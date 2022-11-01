import {
  validate,
  GraphQLSchema,
  FieldDefinitionNode,
  OperationTypeNode,
  DocumentNode,
  GraphQLOutputType,
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
  getOperationASTFromRequest,
} from '@graphql-tools/utils';

import {
  IDelegateToSchemaOptions,
  IDelegateRequestOptions,
  StitchingInfo,
  DelegationContext,
  SubschemaConfig,
} from './types.js';

import { isSubschemaConfig } from './subschemaConfig.js';
import { Subschema } from './Subschema.js';
import { createRequest, getDelegatingOperation } from './createRequest.js';
import { Transformer } from './Transformer.js';
import { applySchemaTransforms } from './applySchemaTransforms.js';
import { normalizedExecutor } from '@graphql-tools/executor';

export function delegateToSchema<
  TContext extends Record<string, any> = Record<string, any>,
  TArgs extends Record<string, any> = any
>(options: IDelegateToSchemaOptions<TContext, TArgs>): any {
  const {
    info,
    schema,
    rootValue = (schema as SubschemaConfig).rootValue ?? info.rootValue,
    operationName = info.operation.name?.value,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    selectionSet,
    fieldNodes = info.fieldNodes,
    context,
  } = options;

  const request = createRequest({
    sourceSchema: info.schema,
    sourceParentType: info.parentType,
    sourceFieldName: info.fieldName,
    fragments: info.fragments,
    variableDefinitions: info.operation.variableDefinitions,
    variableValues: info.variableValues,
    targetRootValue: rootValue,
    targetOperationName: operationName,
    targetOperation: operation,
    targetFieldName: fieldName,
    selectionSet,
    fieldNodes,
    context,
    info,
  });

  return delegateRequest({
    ...options,
    request,
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

export function delegateRequest<
  TContext extends Record<string, any> = Record<string, any>,
  TArgs extends Record<string, any> = any
>(options: IDelegateRequestOptions<TContext, TArgs>) {
  const delegationContext = getDelegationContext(options);

  const transformer = new Transformer<TContext>(delegationContext);

  const processedRequest = transformer.transformRequest(options.request);

  if (options.validateRequest) {
    validateRequest(delegationContext, processedRequest.document);
  }

  const executor = getExecutor(delegationContext);

  return new ValueOrPromise(() => executor(processedRequest))
    .then(originalResult => {
      if (isAsyncIterable(originalResult)) {
        const iterator = originalResult[Symbol.asyncIterator]();
        // "subscribe" to the subscription result and map the result through the transforms
        return mapAsyncIterator(iterator, result => transformer.transformResult(result));
      }
      return transformer.transformResult(originalResult);
    })
    .resolve();
}

function getDelegationContext<TContext extends Record<string, any>>({
  request,
  schema,
  fieldName,
  returnType,
  args,
  info,
  transforms = [],
  transformedSchema,
  skipTypeMerging = false,
}: IDelegateRequestOptions<TContext>): DelegationContext<TContext> {
  const operationDefinition = getOperationASTFromRequest(request);
  let targetFieldName: string;

  if (fieldName == null) {
    targetFieldName = (operationDefinition.selectionSet.selections[0] as unknown as FieldDefinitionNode).name.value;
  } else {
    targetFieldName = fieldName;
  }

  const stitchingInfo = info?.schema.extensions?.['stitchingInfo'] as Maybe<StitchingInfo<TContext>>;

  const subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig<any, any, any, any> =
    stitchingInfo?.subschemaMap.get(schema) ?? schema;

  const operation = operationDefinition.operation;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    const targetSchema = subschemaOrSubschemaConfig.schema;
    return {
      subschema: schema,
      subschemaConfig: subschemaOrSubschemaConfig,
      targetSchema,
      operation,
      fieldName: targetFieldName,
      args,
      context: request.context,
      info,
      returnType: returnType ?? info?.returnType ?? getDelegationReturnType(targetSchema, operation, targetFieldName),
      transforms:
        subschemaOrSubschemaConfig.transforms != null
          ? subschemaOrSubschemaConfig.transforms.concat(transforms)
          : transforms,
      transformedSchema:
        transformedSchema ??
        (subschemaOrSubschemaConfig instanceof Subschema
          ? subschemaOrSubschemaConfig.transformedSchema
          : applySchemaTransforms(targetSchema, subschemaOrSubschemaConfig)),
      skipTypeMerging,
    };
  }

  return {
    subschema: schema,
    subschemaConfig: undefined,
    targetSchema: subschemaOrSubschemaConfig,
    operation,
    fieldName: targetFieldName,
    args,
    context: request.context,
    info,
    returnType:
      returnType ?? info?.returnType ?? getDelegationReturnType(subschemaOrSubschemaConfig, operation, targetFieldName),
    transforms,
    transformedSchema: transformedSchema ?? subschemaOrSubschemaConfig,
    skipTypeMerging,
  };
}

function validateRequest(delegationContext: DelegationContext<any>, document: DocumentNode) {
  const errors = validate(delegationContext.targetSchema, document);
  if (errors.length > 0) {
    if (errors.length > 1) {
      const combinedError = new AggregateError(errors, errors.map(error => error.message).join(', \n'));
      throw combinedError;
    }
    const error = errors[0];
    throw error.originalError || error;
  }
}

const GLOBAL_CONTEXT = {};

function getExecutor<TContext extends Record<string, any>>(
  delegationContext: DelegationContext<TContext>
): Executor<TContext> {
  const { subschemaConfig, targetSchema, context } = delegationContext;

  let executor: Executor = subschemaConfig?.executor || createDefaultExecutor(targetSchema);

  if (subschemaConfig?.batch) {
    const batchingOptions = subschemaConfig?.batchingOptions;
    executor = getBatchingExecutor(
      context ?? GLOBAL_CONTEXT,
      executor,
      batchingOptions?.dataLoaderOptions,
      batchingOptions?.extensionsReducer
    );
  }

  return executor;
}

export const createDefaultExecutor = memoize1(function createDefaultExecutor(schema: GraphQLSchema): Executor {
  return function defaultExecutor(request: ExecutionRequest) {
    return normalizedExecutor({
      schema,
      document: request.document,
      rootValue: request.rootValue,
      contextValue: request.context,
      variableValues: request.variables,
      operationName: request.operationName,
    });
  };
});
