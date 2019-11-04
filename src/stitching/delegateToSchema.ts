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
  SubschemaConfig,
  isSubschemaConfig,
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

async function delegateToSchemaImplementation({
  schema: schemaOrSubschemaConfig,
  rootValue,
  info,
  operation = info.operation.operation,
  fieldName,
  args,
  context,
  transforms = [],
  skipValidation,
}: IDelegateToSchemaOptions,
): Promise<any> {
  let targetSchema: GraphQLSchema;
  let subSchemaConfig: SubschemaConfig;

  if (isSubschemaConfig(schemaOrSubschemaConfig)) {
    subSchemaConfig = schemaOrSubschemaConfig;
    targetSchema = subSchemaConfig.schema;
    rootValue = rootValue || subSchemaConfig.rootValue || info.rootValue;
    transforms = transforms.concat((subSchemaConfig.transforms || []).slice().reverse());
  } else {
    targetSchema = schemaOrSubschemaConfig;
    rootValue = rootValue || info.rootValue;
  }

  const rawDocument: DocumentNode = createDocument(
    fieldName,
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

  transforms = [
    new CheckResultAndHandleErrors(info, fieldName),
    ...transforms,
    new ExpandAbstractTypes(info.schema, targetSchema),
  ];

  if (info.mergeInfo && info.mergeInfo.fragments) {
    transforms.push(
      new ReplaceFieldWithFragment(targetSchema, info.mergeInfo.fragments)
    );
  }

  if (args) {
    transforms.push(
      new AddArgumentsAsVariables(targetSchema, args)
    );
  }

  transforms = transforms.concat([
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
  ]);

  const processedRequest = applyRequestTransforms(rawRequest, transforms);

  if (!skipValidation) {
    const errors = validate(targetSchema, processedRequest.document);
    if (errors.length > 0) {
      throw errors;
    }
  }

  if (operation === 'query' || operation === 'mutation') {
    const executor = createExecutor(targetSchema, rootValue, subSchemaConfig);

    return applyResultTransforms(
      await executor({
        document: processedRequest.document,
        context,
        variables: processedRequest.variables
      }),
      transforms,
    );

  } else if (operation === 'subscription') {
    const subscriber = createSubscriber(targetSchema, rootValue, subSchemaConfig);

    const originalAsyncIterator = (await subscriber({
      document: processedRequest.document,
      context,
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

function createExecutor(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
  subSchemaConfig?: SubschemaConfig
): Delegator {
  let fetcher: Fetcher;
  if (subSchemaConfig) {
    if (subSchemaConfig.dispatcher) {
      const dynamicLinkOrFetcher = subSchemaConfig.dispatcher(context);
      fetcher = (typeof dynamicLinkOrFetcher === 'function') ?
        dynamicLinkOrFetcher :
        linkToFetcher(dynamicLinkOrFetcher);
    } else if (subSchemaConfig.link) {
      fetcher = linkToFetcher(subSchemaConfig.link);
    } else if (subSchemaConfig.fetcher) {
      fetcher = subSchemaConfig.fetcher;
    }

    if (!fetcher && !rootValue && subSchemaConfig.rootValue) {
      rootValue = subSchemaConfig.rootValue;
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
  subSchemaConfig?: SubschemaConfig
): Delegator {
  let link: ApolloLink;

  if (subSchemaConfig) {
    if (subSchemaConfig.dispatcher) {
      link = subSchemaConfig.dispatcher(context) as ApolloLink;
    } else if (subSchemaConfig.link) {
      link = subSchemaConfig.link;
    }

    if (!link && !rootValue && subSchemaConfig.rootValue) {
      rootValue = subSchemaConfig.rootValue;
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
