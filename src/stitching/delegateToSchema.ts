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
  NameNode,
} from 'graphql';

import {
  Operation,
  Request,
  IDelegateToSchemaOptions,
} from '../Interfaces';

import {
  applyRequestTransforms,
  applyResultTransforms,
} from '../transforms/transforms';

import AddArgumentsAsVariables from '../transforms/AddArgumentsAsVariables';
import FilterToSchema from '../transforms/FilterToSchema';
import AddTypenameToAbstract from '../transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from '../transforms/CheckResultAndHandleErrors';

export default function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
  ...args: any[],
): Promise<any> {
  if (options instanceof GraphQLSchema) {
    throw new Error(
      'Passing positional arguments to delegateToSchema is a deprecated. ' +
      'Please pass named parameters instead.'
    );
  }
  return delegateToSchemaImplementation(options);
}

async function delegateToSchemaImplementation(
  options: IDelegateToSchemaOptions,
): Promise<any> {
  const { info, args = {} } = options;
  const rawDocument: DocumentNode = createDocument(
    options.fieldName,
    options.operation,
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

  const transforms = [
    ...(options.transforms || []),
    new AddArgumentsAsVariables(options.schema, args),
    new FilterToSchema(options.schema),
    new AddTypenameToAbstract(options.schema),
    new CheckResultAndHandleErrors(info, options.fieldName),
  ];

  const processedRequest = applyRequestTransforms(rawRequest, transforms);

  if (!options.skipValidation) {
    const errors = validate(options.schema, processedRequest.document);
    if (errors.length > 0) {
      throw errors;
    }
  }

  if (options.operation === 'query' || options.operation === 'mutation') {
    return applyResultTransforms(
      await execute(
        options.schema,
        processedRequest.document,
        info.rootValue,
        options.context,
        processedRequest.variables,
      ),
      transforms,
    );
  }

  if (options.operation === 'subscription') {
    // apply result processing ???
    return subscribe(
      options.schema,
      processedRequest.document,
      info.rootValue,
      options.context,
      processedRequest.variables,
    );
  }
}

function createDocument(
  targetField: string,
  targetOperation: Operation,
  originalSelections: Array<SelectionNode>,
  fragments: Array<FragmentDefinitionNode>,
  variables: Array<VariableDefinitionNode>,
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
