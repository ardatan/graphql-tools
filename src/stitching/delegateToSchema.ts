import {
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  ExecutionResult,
} from 'graphql';

import {
  IDelegateToSchemaOptions,
  IDelegateRequestOptions,
  Fetcher,
  Delegator,
  SubschemaConfig,
  isSubschemaConfig,
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

import {
  createRequestFromInfo,
  getDelegatingOperation,
} from './createRequest';

import { ApolloLink, execute as executeLink } from 'apollo-link';
import linkToFetcher from './linkToFetcher';
import { observableToAsyncIterable } from './observableToAsyncIterable';
import { isAsyncIterable } from 'iterall';
import mapAsyncIterator from './mapAsyncIterator';

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

export function delegateRequest({
  request,
  schema: subschema,
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
  let subschemaConfig: SubschemaConfig;

  if (isSubschemaConfig(subschema)) {
    subschemaConfig = subschema;
    targetSchema = subschemaConfig.schema;
    rootValue = rootValue || subschemaConfig.rootValue || info.rootValue;
    transforms = transforms.concat((subschemaConfig.transforms || []).slice().reverse());
  } else {
    targetSchema = subschema;
    rootValue = rootValue || info.rootValue;
  }

  let delegationTransforms: Array<Transform> = [
    new CheckResultAndHandleErrors(info, fieldName, subschema, context, returnType, skipTypeMerging),
  ];

  if (info.mergeInfo) {
    delegationTransforms.push(
      new AddReplacementSelectionSets(info.schema, info.mergeInfo.replacementSelectionSets),
      new AddMergedTypeSelectionSets(info.schema, info.mergeInfo.mergedTypes),
    );
  }

  delegationTransforms = delegationTransforms.concat(transforms);

  delegationTransforms.push(
    new ExpandAbstractTypes(info.schema, targetSchema),
  );

  if (info.mergeInfo) {
    delegationTransforms.push(
      new AddReplacementFragments(targetSchema, info.mergeInfo.replacementFragments),
    );
  }

  delegationTransforms.push(
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
  );

  request = applyRequestTransforms(request, delegationTransforms);

  if (!skipValidation) {
    const errors = validate(targetSchema, request.document);
    if (errors.length > 0) {
      throw errors;
    }
  }

  if (operation === 'query' || operation === 'mutation') {

    const executor = createExecutor(targetSchema, rootValue, subschemaConfig);

    const executionResult: ExecutionResult | Promise<ExecutionResult> = executor({
      document: request.document,
      context,
      variables: request.variables
    });

    if (executionResult instanceof Promise) {
      return executionResult.then((originalResult: any) =>
        applyResultTransforms(originalResult, delegationTransforms));
    } else {
      return applyResultTransforms(executionResult, delegationTransforms);
    }

  } else if (operation === 'subscription') {

    const subscriber = createSubscriber(targetSchema, rootValue, subschemaConfig);

    return subscriber({
      document: request.document,
      context,
      variables: request.variables,
    }).then((subscriptionResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => {
      if (isAsyncIterable(subscriptionResult)) {
        // "subscribe" to the subscription result and map the result through the transforms
        return mapAsyncIterator<ExecutionResult, any>(subscriptionResult, result => {
          const transformedResult = applyResultTransforms(result, delegationTransforms);
          // wrap with fieldName to return for an additional round of resolutioon
          // with payload as rootValue
          return {
            [info.fieldName]: transformedResult,
          };
        });
      } else {
        return applyResultTransforms(subscriptionResult, delegationTransforms);
      }
    });

  }
}


function createExecutor(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
  subschemaConfig?: SubschemaConfig
): Delegator {
  let fetcher: Fetcher;
  if (subschemaConfig) {
    if (subschemaConfig.dispatcher) {
      const dynamicLinkOrFetcher = subschemaConfig.dispatcher(context);
      fetcher = (typeof dynamicLinkOrFetcher === 'function') ?
        dynamicLinkOrFetcher :
        linkToFetcher(dynamicLinkOrFetcher);
    } else if (subschemaConfig.link) {
      fetcher = linkToFetcher(subschemaConfig.link);
    } else if (subschemaConfig.fetcher) {
      fetcher = subschemaConfig.fetcher;
    }

    if (!fetcher && !rootValue && subschemaConfig.rootValue) {
      rootValue = subschemaConfig.rootValue;
    }
  }

  if (fetcher) {
    return ({ document, context, variables }) => fetcher({
      query: document,
      variables,
      context: { graphqlContext: context }
    });
  } else {
    return ({ document, context, variables }) => execute({
      schema,
      document,
      rootValue,
      contextValue: context,
      variableValues: variables,
    });
  }
}

function createSubscriber(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
  subschemaConfig?: SubschemaConfig
): Delegator {
  let link: ApolloLink;

  if (subschemaConfig) {
    if (subschemaConfig.dispatcher) {
      link = subschemaConfig.dispatcher(context) as ApolloLink;
    } else if (subschemaConfig.link) {
      link = subschemaConfig.link;
    }

    if (!link && !rootValue && subschemaConfig.rootValue) {
      rootValue = subschemaConfig.rootValue;
    }
  }

  if (link) {
    return ({ document, context, variables }) => {
      const operation = {
        query: document,
        variables,
        context: { graphqlContext: context }
      };
      const observable = executeLink(link, operation);
      return observableToAsyncIterable(observable);
    };
  } else {
    return ({ document, context, variables }) => subscribe({
      schema,
      document,
      rootValue,
      contextValue: context,
      variableValues: variables,
    });
    }
}
