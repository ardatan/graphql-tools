import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  SelectionNode,
  subscribe,
  execute,
  validate,
  VariableDefinitionNode,
} from 'graphql';
import { Operation, Request } from '../Interfaces';
import {
  Transform,
  applyRequestTransforms,
  applyResultTransforms,
} from '../transforms/transforms';
import AddArgumentsAsVariables from '../transforms/AddArgumentsAsVariables';
import FilterToSchema from '../transforms/FilterToSchema';
import AddTypenameToAbstract from '../transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from '../transforms/CheckResultAndHandleErrors';

export default async function delegateToSchema(
  targetSchema: GraphQLSchema,
  targetOperation: Operation,
  targetField: string,
  args: { [key: string]: any },
  context: { [key: string]: any },
  info: GraphQLResolveInfo,
  transforms?: Array<Transform>,
): Promise<any> {
  const rawDocument: DocumentNode = createDocument(
    targetField,
    targetOperation,
    info.fieldNodes,
    Object.keys(info.fragments).map(
      fragmentName => info.fragments[fragmentName],
    ),
    info.operation.variableDefinitions,
  );

  const rawRequest: Request = {
    document: rawDocument,
    variables: info.variableValues as Record<string, any>,
  };

  transforms = [
    ...(transforms || []),
    AddArgumentsAsVariables(targetSchema, args),
    FilterToSchema(targetSchema),
    AddTypenameToAbstract(targetSchema),
    CheckResultAndHandleErrors(info, targetField),
  ];

  const processedRequest = applyRequestTransforms(rawRequest, transforms);

  const errors = validate(targetSchema, processedRequest.document);
  if (errors.length > 0) {
    throw errors;
  }

  if (targetOperation === 'query' || targetOperation === 'mutation') {
    const rawResult = await execute(
      targetSchema,
      processedRequest.document,
      info.rootValue,
      context,
      processedRequest.variables,
    );

    const result = applyResultTransforms(rawResult, transforms);
    return result;
  }

  if (targetOperation === 'subscription') {
    // apply result processing ???
    return subscribe(
      targetSchema,
      processedRequest.document,
      info.rootValue,
      context,
      processedRequest.variables,
    );
  }
}

export function createDocument(
  targetField: string,
  targetOperation: Operation,
  originalSelections: Array<SelectionNode>,
  fragments: Array<FragmentDefinitionNode>,
  variables: Array<VariableDefinitionNode>,
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
  };

  return {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...fragments],
  };
}
