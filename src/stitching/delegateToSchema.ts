import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  SelectionNode,
  subscribe,
  execute,
  validate,
  VariableDefinitionNode,
  GraphQLSchema,
  ExecutionResult,
  NameNode,
} from 'graphql';

import {
  IDelegateToSchemaOptions,
  Operation,
  Request,
  Fetcher,
  Delegator,
  isSchemaExecutionConfig,
} from '../Interfaces';

import {
  applyRequestTransforms,
  applyResultTransforms,
} from '../transforms/transforms';

import AddArgumentsAsVariables from '../transforms/AddArgumentsAsVariables';
import FilterToSchema from '../transforms/FilterToSchema';
import AddTypenameToAbstract from '../transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from '../transforms/CheckResultAndHandleErrors';
import mapAsyncIterator from './mapAsyncIterator';
import ExpandAbstractTypes from '../transforms/ExpandAbstractTypes';
import ReplaceFieldWithFragment from '../transforms/ReplaceFieldWithFragment';

import { ApolloLink, execute as executeLink } from 'apollo-link';
import linkToFetcher from './linkToFetcher';
import { observableToAsyncIterable } from './observableToAsyncIterable';

export default function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
  ...args: any[]
): Promise<any> {
  if (options instanceof GraphQLSchema) {
    throw new Error(
      'Passing positional arguments to delegateToSchema is a deprecated. ' +
        'Please pass named parameters instead.',
    );
  }
  return delegateToSchemaImplementation(options);
}

async function delegateToSchemaImplementation(
  options: IDelegateToSchemaOptions,
): Promise<any> {
  const { schema: schemaOrSchemaConfig } = options;
  let targetSchema;
  if (isSchemaExecutionConfig(schemaOrSchemaConfig)) {
    targetSchema = schemaOrSchemaConfig.schema;
    options.link = schemaOrSchemaConfig.link;
    options.fetcher = schemaOrSchemaConfig.fetcher;
    options.dispatcher = schemaOrSchemaConfig.dispatcher;
  } else {
    targetSchema = schemaOrSchemaConfig;
  }

  const { info, args = {} } = options;
  const operation = options.operation || info.operation.operation;
  const rawDocument: DocumentNode = createDocument(
    options.fieldName,
    operation,
    info.fieldNodes,
    Object.keys(info.fragments).map(
      fragmentName => info.fragments[fragmentName],
    ),
    info.operation.variableDefinitions,
    info.operation.name,
  );

  const rawRequest: Request = {
    document: rawDocument,
    variables: info.variableValues as Record<string, any>,
  };

  let transforms = [
    ...(options.transforms || []),
    new ExpandAbstractTypes(info.schema, targetSchema),
  ];

  if (info.mergeInfo && info.mergeInfo.fragments) {
    transforms.push(
      new ReplaceFieldWithFragment(targetSchema, info.mergeInfo.fragments),
    );
  }

  transforms = transforms.concat([
    new AddArgumentsAsVariables(targetSchema, args),
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
    new CheckResultAndHandleErrors(info, options.fieldName),
  ]);

  const processedRequest = applyRequestTransforms(rawRequest, transforms);

  if (!options.skipValidation) {
    const errors = validate(targetSchema, processedRequest.document);
    if (errors.length > 0) {
      throw errors;
    }
  }

  if (operation === 'query' || operation === 'mutation') {
    options.executor = options.executor || getExecutor(targetSchema, options);

    return applyResultTransforms(
      await options.executor({
        document: processedRequest.document,
        context: options.context,
        variables: processedRequest.variables
      }),
      transforms,
    );
  }

  if (operation === 'subscription') {
    options.subscriber = options.subscriber || getSubscriber(targetSchema, options);

    const originalAsyncIterator = (await options.subscriber({
      document: processedRequest.document,
      context: options.context,
      variables: processedRequest.variables,
    })) as AsyncIterator<ExecutionResult>;

    // "subscribe" to the subscription result and map the result through the transforms
    return mapAsyncIterator<ExecutionResult, any>(originalAsyncIterator, result => {
      const transformedResult = applyResultTransforms(result, transforms);

      // wrap with fieldName to return for an additional round of resolutioon
      // with payload as rootValue
      return {
        [info.fieldName]: transformedResult,
      };
    });
  }
}

function createDocument(
  targetField: string,
  targetOperation: Operation,
  originalSelections: ReadonlyArray<SelectionNode>,
  fragments: Array<FragmentDefinitionNode>,
  variables: ReadonlyArray<VariableDefinitionNode>,
  operationName: NameNode,
): DocumentNode {
  let selections: Array<SelectionNode> = [];
  let args: Array<ArgumentNode> = [];

  originalSelections.forEach((field: FieldNode) => {
    const fieldSelections = field.selectionSet
      ? field.selectionSet.selections
      : [];
    selections = selections.concat(fieldSelections);
    args = args.concat(field.arguments || []);
  });

  let selectionSet = null;
  if (selections.length > 0) {
    selectionSet = {
      kind: Kind.SELECTION_SET,
      selections: selections,
    };
  }

  const rootField: FieldNode = {
    kind: Kind.FIELD,
    alias: null,
    arguments: args,
    selectionSet,
    name: {
      kind: Kind.NAME,
      value: targetField,
    },
  };
  const rootSelectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [rootField],
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation,
    variableDefinitions: variables,
    selectionSet: rootSelectionSet,
    name: operationName,
  };

  return {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...fragments],
  };
}

function getExecutor(schema: GraphQLSchema, options: IDelegateToSchemaOptions): Delegator {
  let fetcher: Fetcher;
  if (options.dispatcher) {
    const dynamicLinkOrFetcher = options.dispatcher(context);
    fetcher = (typeof dynamicLinkOrFetcher === 'function') ?
      dynamicLinkOrFetcher :
      linkToFetcher(dynamicLinkOrFetcher);
  } else if (options.link) {
    fetcher = linkToFetcher(options.link);
  } else if (options.fetcher) {
    fetcher = options.fetcher;
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
      rootValue: options.info.rootValue,
      contextValue: context,
      variableValues: variables,
    });
  }
}

function getSubscriber(schema: GraphQLSchema, options: IDelegateToSchemaOptions): Delegator {
  let link: ApolloLink;
  if (options.dispatcher) {
    link = options.dispatcher(context) as ApolloLink;
  } else if (options.link) {
    link = options.link;
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
      rootValue: options.info.rootValue,
      contextValue: context,
      variableValues: variables,
    });
  }
}
