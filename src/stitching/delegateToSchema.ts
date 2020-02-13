import { isAsyncIterable } from 'iterall';
import { ApolloLink, execute as executeLink } from 'apollo-link';
import {
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  ExecutionResult,
  GraphQLOutputType,
} from 'graphql';

import {
  IDelegateToSchemaOptions,
  IDelegateRequestOptions,
  Fetcher,
  Delegator,
  SubschemaConfig,
  isSubschemaConfig,
  IGraphQLToolsResolveInfo,
} from '../Interfaces';
import {
  ExpandAbstractTypes,
  FilterToSchema,
  AddReplacementSelectionSets,
  AddReplacementFragments,
  AddMergedTypeSelectionSets,
  AddTypenameToAbstract,
  CheckResultAndHandleErrors,
  applyRequestTransforms,
  applyResultTransforms,
  Transform,
} from '../transforms';

import { createRequestFromInfo, getDelegatingOperation } from './createRequest';
import linkToFetcher from './linkToFetcher';
import { observableToAsyncIterable } from './observableToAsyncIterable';
import mapAsyncIterator from './mapAsyncIterator';
import { combineErrors } from './errors';

export default function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
): any {
  if (options instanceof GraphQLSchema) {
    throw new Error(
      'Passing positional arguments to delegateToSchema is deprecated. ' +
        'Please pass named parameters instead.',
    );
  }

  const {
    schema: subschemaOrSubschemaConfig,
    info,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    returnType = info.returnType,
    args,
    selectionSet,
    fieldNodes,
  } = options;

  const request = createRequestFromInfo({
    info,
    schema: subschemaOrSubschemaConfig,
    operation,
    fieldName,
    args,
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
  info: IGraphQLToolsResolveInfo,
  context: Record<string, any>,
  targetSchema: GraphQLSchema,
  fieldName: string,
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
    const executor = createExecutor(
      targetSchema,
      targetRootValue,
      context,
      subschemaConfig,
    );

    const executionResult:
      | ExecutionResult
      | Promise<ExecutionResult> = executor({
      document: processedRequest.document,
      context,
      variables: processedRequest.variables,
    });

    if (executionResult instanceof Promise) {
      return executionResult.then((originalResult: any) =>
        applyResultTransforms(originalResult, delegationTransforms),
      );
    }
    return applyResultTransforms(executionResult, delegationTransforms);
  }

  const subscriber = createSubscriber(
    targetSchema,
    targetRootValue,
    context,
    subschemaConfig,
  );

  return subscriber({
    document: processedRequest.document,
    context,
    variables: processedRequest.variables,
  }).then(
    (
      subscriptionResult:
        | AsyncIterableIterator<ExecutionResult>
        | ExecutionResult,
    ) => {
      if (isAsyncIterable(subscriptionResult)) {
        // "subscribe" to the subscription result and map the result through the transforms
        return mapAsyncIterator<ExecutionResult, any>(
          subscriptionResult,
          result => {
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

function createExecutor(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
  context: Record<string, any>,
  subschemaConfig?: SubschemaConfig,
): Delegator {
  let fetcher: Fetcher;
  let targetRootValue: Record<string, any> = rootValue;
  if (subschemaConfig != null) {
    if (subschemaConfig.dispatcher != null) {
      const dynamicLinkOrFetcher = subschemaConfig.dispatcher(context);
      fetcher =
        typeof dynamicLinkOrFetcher === 'function'
          ? dynamicLinkOrFetcher
          : linkToFetcher(dynamicLinkOrFetcher);
    } else if (subschemaConfig.link != null) {
      fetcher = linkToFetcher(subschemaConfig.link);
    } else if (subschemaConfig.fetcher != null) {
      fetcher = subschemaConfig.fetcher;
    }

    if (!fetcher && !rootValue && subschemaConfig.rootValue != null) {
      targetRootValue = subschemaConfig.rootValue;
    }
  }

  if (fetcher != null) {
    return ({ document, context: graphqlContext, variables }) =>
      fetcher({
        query: document,
        variables,
        context: { graphqlContext },
      });
  }

  return ({ document, context: graphqlContext, variables }) =>
    execute({
      schema,
      document,
      rootValue: targetRootValue,
      contextValue: graphqlContext,
      variableValues: variables,
    });
}

function createSubscriber(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
  context: Record<string, any>,
  subschemaConfig?: SubschemaConfig,
): Delegator {
  let link: ApolloLink;
  let targetRootValue: Record<string, any> = rootValue;

  if (subschemaConfig != null) {
    if (subschemaConfig.dispatcher != null) {
      link = subschemaConfig.dispatcher(context) as ApolloLink;
    } else if (subschemaConfig.link != null) {
      link = subschemaConfig.link;
    }

    if (!link && !rootValue && subschemaConfig.rootValue != null) {
      targetRootValue = subschemaConfig.rootValue;
    }
  }

  if (link != null) {
    return ({ document, context: graphqlContext, variables }) => {
      const operation = {
        query: document,
        variables,
        context: { graphqlContext },
      };
      const observable = executeLink(link, operation);
      return observableToAsyncIterable(observable);
    };
  }

  return ({ document, context: graphqlContext, variables }) =>
    subscribe({
      schema,
      document,
      rootValue: targetRootValue,
      contextValue: graphqlContext,
      variableValues: variables,
    });
}
