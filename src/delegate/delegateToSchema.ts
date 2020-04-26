import {
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  ExecutionResult,
  GraphQLOutputType,
  isSchema,
  GraphQLResolveInfo,
} from 'graphql';

import {
  IDelegateToSchemaOptions,
  IDelegateRequestOptions,
  SubschemaConfig,
  isSubschemaConfig,
  Transform,
  Executor,
  Subscriber,
} from '../Interfaces';
import {
  applyRequestTransforms,
  applyResultTransforms,
} from '../utils/transforms';

import { mapAsyncIterator } from '../utils/mapAsyncIterator';

import ExpandAbstractTypes from './transforms/ExpandAbstractTypes';
import FilterToSchema from './transforms/FilterToSchema';
import AddReplacementSelectionSets from './transforms/AddReplacementSelectionSets';
import AddReplacementFragments from './transforms/AddReplacementFragments';
import AddMergedTypeSelectionSets from './transforms/AddMergedTypeSelectionSets';
import AddTypenameToAbstract from './transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from './transforms/CheckResultAndHandleErrors';
import AddArgumentsAsVariables from './transforms/AddArgumentsAsVariables';
import { combineErrors } from './errors';
import { createRequestFromInfo, getDelegatingOperation } from './createRequest';

export function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
): any {
  if (isSchema(options)) {
    throw new Error(
      'Passing positional arguments to delegateToSchema is deprecated. ' +
      'Please pass named parameters instead.',
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

function buildDelegationTransforms(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  info: GraphQLResolveInfo,
  context: Record<string, any>,
  targetSchema: GraphQLSchema,
  fieldName: string,
  args: Record<string, any>,
  returnType: GraphQLOutputType,
  transforms: Array<Transform>,
  skipTypeMerging: boolean,
): Array<Transform> {
  let delegationTransforms: Array<Transform> = [
    new CheckResultAndHandleErrors(
      info,
      fieldName,
      subschemaOrSubschemaConfig,
      context,
      returnType,
      skipTypeMerging,
    ),
  ];

  if (info.mergeInfo != null) {
    delegationTransforms.push(
      new AddReplacementSelectionSets(
        info.schema,
        info.mergeInfo.replacementSelectionSets,
      ),
      new AddMergedTypeSelectionSets(info.schema, info.mergeInfo.mergedTypes),
    );
  }

  delegationTransforms = delegationTransforms.concat(transforms);

  delegationTransforms.push(new ExpandAbstractTypes(info.schema, targetSchema));

  if (info.mergeInfo != null) {
    delegationTransforms.push(
      new AddReplacementFragments(
        targetSchema,
        info.mergeInfo.replacementFragments,
      ),
    );
  }

  if (args != null) {
    delegationTransforms.push(new AddArgumentsAsVariables(targetSchema, args));
  }

  delegationTransforms.push(
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
  );

  return delegationTransforms;
}

export function delegateRequest({
  request,
  schema: subschemaOrSubschemaConfig,
  rootValue,
  info,
  operation = getDelegatingOperation(info.parentType, info.schema),
  fieldName = info.fieldName,
  args,
  returnType = info.returnType,
  context,
  transforms = [],
  skipValidation,
  skipTypeMerging,
}: IDelegateRequestOptions): any {
  let targetSchema: GraphQLSchema;
  let targetRootValue: Record<string, any>;
  let requestTransforms: Array<Transform> = transforms.slice();
  let subschemaConfig: SubschemaConfig;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    subschemaConfig = subschemaOrSubschemaConfig;
    targetSchema = subschemaConfig.schema;
    targetRootValue =
      rootValue != null
        ? rootValue
        : subschemaConfig.rootValue != null
          ? subschemaConfig.rootValue
          : info.rootValue;
    if (subschemaConfig.transforms != null) {
      requestTransforms = requestTransforms.concat(subschemaConfig.transforms);
    }
  } else {
    targetSchema = subschemaOrSubschemaConfig;
    targetRootValue = rootValue != null ? rootValue : info.rootValue;
  }

  const delegationTransforms = buildDelegationTransforms(
    subschemaOrSubschemaConfig,
    info,
    context,
    targetSchema,
    fieldName,
    args,
    returnType,
    requestTransforms.reverse(),
    skipTypeMerging,
  );

  const processedRequest = applyRequestTransforms(
    request,
    delegationTransforms,
  );

  if (!skipValidation) {
    const errors = validate(targetSchema, processedRequest.document);
    if (errors.length > 0) {
      const combinedError: Error = combineErrors(errors);
      throw combinedError;
    }
  }

  if (operation === 'query' || operation === 'mutation') {
    const executor =
      subschemaConfig?.executor ||
      createDefaultExecutor(
        targetSchema,
        subschemaConfig?.rootValue || targetRootValue,
      );

    const executionResult = executor({
      document: processedRequest.document,
      variables: processedRequest.variables,
      context,
      info,
    });

    if (executionResult instanceof Promise) {
      return executionResult.then((originalResult: any) =>
        applyResultTransforms(originalResult, delegationTransforms),
      );
    }
    return applyResultTransforms(executionResult, delegationTransforms);
  }

  const subscriber =
    subschemaConfig?.subscriber ||
    createDefaultSubscriber(
      targetSchema,
      subschemaConfig?.rootValue || targetRootValue,
    );

  return subscriber({
    document: processedRequest.document,
    variables: processedRequest.variables,
    context,
    info,
  }).then(
    (
      subscriptionResult:
        | AsyncIterableIterator<ExecutionResult>
        | ExecutionResult,
    ) => {
      if (Symbol.asyncIterator in subscriptionResult) {
        // "subscribe" to the subscription result and map the result through the transforms
        return mapAsyncIterator<ExecutionResult, any>(
          subscriptionResult as AsyncIterableIterator<ExecutionResult>,
          (result) => {
            const transformedResult = applyResultTransforms(
              result,
              delegationTransforms,
            );
            // wrap with fieldName to return for an additional round of resolutioon
            // with payload as rootValue
            return {
              [info.fieldName]: transformedResult,
            };
          },
        );
      }

      return applyResultTransforms(subscriptionResult, delegationTransforms);
    },
  );
}

function createDefaultExecutor(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
): Executor {
  return ({ document, context, variables, info }) =>
    execute(schema, document, rootValue || info.rootValue, context, variables);
}

function createDefaultSubscriber(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
): Subscriber {
  return ({ document, context, variables, info }) =>
    subscribe(
      schema,
      document,
      rootValue || info.rootValue,
      context,
      variables,
    );
}
