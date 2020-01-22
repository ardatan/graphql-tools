import {
  ArgumentNode,
  FieldNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  SelectionNode,
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  ExecutionResult,
  GraphQLObjectType,
  OperationTypeNode,
  typeFromAST,
  NamedTypeNode,
  GraphQLInputType,
  GraphQLField,
  GraphQLArgument,
  astFromValue,
} from 'graphql';

import {
  IDelegateToSchemaOptions,
  ICreateDelegatingRequestOptions,
  IDelegateRequestOptions,
  Operation,
  Request,
  Fetcher,
  Delegator,
  SubschemaConfig,
  isSubschemaConfig,
  IGraphQLToolsResolveInfo,
} from '../Interfaces';

import {
  applyRequestTransforms,
  applyResultTransforms,
} from '../transforms/transforms';

import FilterToSchema from '../transforms/FilterToSchema';
import AddTypenameToAbstract from '../transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from '../transforms/CheckResultAndHandleErrors';
import mapAsyncIterator from './mapAsyncIterator';
import ExpandAbstractTypes from '../transforms/ExpandAbstractTypes';
import AddReplacementFragments from '../transforms/AddReplacementFragments';

import { ApolloLink, execute as executeLink } from 'apollo-link';
import linkToFetcher from './linkToFetcher';
import { observableToAsyncIterable } from './observableToAsyncIterable';
import { AddMergedTypeFragments } from '../transforms';

import { isAsyncIterable } from 'iterall';
import { serializeInputValue } from '../utils';

function getDelegatingOperation(
  parentType: GraphQLObjectType,
  schema: GraphQLSchema
): OperationTypeNode {
  if (parentType === schema.getMutationType()) {
    return 'mutation';
  } else if (parentType === schema.getSubscriptionType()) {
    return 'subscription';
  } else {
    return 'query';
  }
}

export default function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
): any {
  if (options instanceof GraphQLSchema) {
    throw new Error(
      'Passing positional arguments to delegateToSchema is a deprecated. ' +
        'Please pass named parameters instead.',
    );
  }

  const {
    schema: subschema,
    rootValue,
    info,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    returnType = info.returnType,
    args,
    context,
    transforms = [],
    skipValidation,
    skipTypeMerging,
  } = options;

  const request = createDelegatingRequest({
    schema: subschema,
    info,
    operation,
    fieldName,
    args,
    transforms,
    skipValidation,
  });

  return delegateRequest({
    request,
    schema: subschema,
    rootValue,
    info,
    operation,
    fieldName,
    returnType,
    context,
    transforms,
    skipTypeMerging,
  });
}

export function createDelegatingRequest({
  schema: subschema,
  info,
  operation = getDelegatingOperation(info.parentType, info.schema),
  fieldName = info.fieldName,
  args,
  transforms = [],
  skipValidation,
}: ICreateDelegatingRequestOptions): any {
  let targetSchema: GraphQLSchema;
  let subschemaConfig: SubschemaConfig;

  if (isSubschemaConfig(subschema)) {
    subschemaConfig = subschema;
    targetSchema = subschemaConfig.schema;
    transforms = transforms.concat((subschemaConfig.transforms || []).slice().reverse());
  } else {
    targetSchema = subschema;
  }

  const initialRequest = createInitialRequest(info, operation, fieldName, targetSchema, args);

  transforms = [
    ...transforms,
    new ExpandAbstractTypes(info.schema, targetSchema),
  ];

  if (info.mergeInfo) {
    transforms.push(
      new AddReplacementFragments(targetSchema, info.mergeInfo.replacementFragments),
      new AddMergedTypeFragments(targetSchema, info.mergeInfo.mergedTypes),
    );
  }

  transforms.push(
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
  );

  const delegatingRequest = applyRequestTransforms(initialRequest, transforms);

  if (!skipValidation) {
    const errors = validate(targetSchema, delegatingRequest.document);
    if (errors.length > 0) {
      throw errors;
    }
  }

  return delegatingRequest;
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

  transforms = [
    new CheckResultAndHandleErrors(info, fieldName, subschema, context, returnType, skipTypeMerging),
    ...transforms,
  ];

  if (operation === 'query' || operation === 'mutation') {

    const executor = createExecutor(targetSchema, rootValue, subschemaConfig);

    const executionResult: ExecutionResult | Promise<ExecutionResult> = executor({
      document: request.document,
      context,
      variables: request.variables
    });

    if (executionResult instanceof Promise) {
      return executionResult.then((originalResult: any) => applyResultTransforms(originalResult, transforms));
    } else {
      return applyResultTransforms(executionResult, transforms);
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
          const transformedResult = applyResultTransforms(result, transforms);
          // wrap with fieldName to return for an additional round of resolutioon
          // with payload as rootValue
          return {
            [info.fieldName]: transformedResult,
          };
        });
      } else {
        return applyResultTransforms(subscriptionResult, transforms);
      }
    });

  }
}

function createInitialRequest(
  info: IGraphQLToolsResolveInfo,
  targetOperation: Operation,
  targetField: string,
  targetSchema: GraphQLSchema,
  newArgsMap: Record<string, any>,
): Request {
  let selections: Array<SelectionNode> = [];
  let args: ReadonlyArray<ArgumentNode> = info.fieldNodes[0].arguments || [];

  const originalSelections: ReadonlyArray<SelectionNode> = info.fieldNodes;
  originalSelections.forEach((field: FieldNode) => {
    const fieldSelections = field.selectionSet
      ? field.selectionSet.selections
      : [];
    selections = selections.concat(fieldSelections);
  });

  let selectionSet = undefined;
  if (selections.length > 0) {
    selectionSet = {
      kind: Kind.SELECTION_SET,
      selections: selections,
    };
  }

  const rootField: FieldNode = {
    kind: Kind.FIELD,
    alias: null,
    arguments: newArgsMap ? updateArguments(targetSchema, targetOperation, targetField, args, newArgsMap) : args,
    selectionSet,
    name: {
      kind: Kind.NAME,
      value: targetField || info.fieldNodes[0].name.value,
    },
  };

  const rootSelectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [rootField],
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation || getDelegatingOperation(info.parentType, info.schema),
    variableDefinitions: info.operation.variableDefinitions,
    selectionSet: rootSelectionSet,
    name: info.operation.name,
  };

  const fragments: Array<FragmentDefinitionNode> = Object.keys(info.fragments).map(
    fragmentName => info.fragments[fragmentName],
  );

  const document = {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...fragments],
  };

  const variableValues = info.variableValues;
  const variables = {};
  for (const variableDefinition of info.operation.variableDefinitions) {
    const varName = variableDefinition.variable.name.value;
    const varType = typeFromAST(info.schema, (variableDefinition.type as NamedTypeNode)) as GraphQLInputType;
    variables[varName] = serializeInputValue(varType, variableValues[varName]);
  }

  return {
    document,
    variables,
  };
}

function updateArguments(
  schema: GraphQLSchema,
  operation: OperationTypeNode,
  fieldName: string,
  argumentNodes: ReadonlyArray<ArgumentNode>,
  newArgsMap: Record<string, any>,
): Array<ArgumentNode> {
  let type: GraphQLObjectType;
  if (operation === 'subscription') {
    type = schema.getSubscriptionType();
  } else if (operation === 'mutation') {
    type = schema.getMutationType();
  } else {
    type = schema.getQueryType();
  }

  const newArgs: Record<string, ArgumentNode> = {};
  argumentNodes.forEach((argument: ArgumentNode) => {
    newArgs[argument.name.value] = argument;
  });

  const field: GraphQLField<any, any> = type.getFields()[fieldName];
  field.args.forEach((argument: GraphQLArgument) => {
    if (newArgsMap[argument.name]) {
      newArgs[argument.name] = {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: argument.name,
        },
        value: astFromValue(newArgsMap[argument.name], argument.type),
      };
    }
  });

  return Object.keys(newArgs).map(argName => newArgs[argName]);
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
