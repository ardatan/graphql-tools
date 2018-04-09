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
import { FetcherOperation } from './makeRemoteExecutableSchema';
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

export function createBatchOperation(
  targetSchema: GraphQLSchema,
  targetOperation: 'query' | 'mutation' | 'subscription',
  rootDefs: { [key: string]: [{ [key: string]: any }, { [key: string]: any }] },
  graphqlContext: { [key: string]: any },
  documentInfo: {
    operation: {
      name?: { [key: string]: any }
      variableDefinitions?: Array<VariableDefinitionNode>,
    },
    variableValues?: { [variableName: string]: any },
    fragments?: { [fragmentName: string]: FragmentDefinitionNode },
  },
  transforms?: Array<Transform>,
): FetcherOperation {
  const roots = Object.keys(rootDefs).map(key => {
    const [args, info] = rootDefs[key];
    const [a, n] = key.split(':');
    const name = n || a;
    const alias = n ? a : null;
    return {
      key: alias || name,
      name,
      alias,
      args,
      info: info || documentInfo
    };
  });

  const selections: Array<SelectionNode> = roots.reduce((newSelections, { key, name: rootFieldName, info, alias, args }) => {
    const rootSelections = info.fieldNodes.map((selection: FieldNode) => {
       if (selection.kind === Kind.FIELD) {
         const rootField: FieldNode = {
           kind: Kind.FIELD,
           name: {
             kind: Kind.NAME,
             value: rootFieldName,
           },
           alias: alias
            ? {
              kind: Kind.NAME,
              value: alias
            }
            : null,
           arguments: selection.arguments,
           selectionSet: selection.selectionSet
         };
         return rootField;
       }
       return selection;
    });

    return newSelections.concat(rootSelections);
  }, []);

  const selectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections,
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation,
    variableDefinitions: documentInfo.operation.variableDefinitions,
    selectionSet,
  };

  const fragments = Object.keys(documentInfo.fragments).map(
    fragmentName => documentInfo.fragments[fragmentName],
  );

  const document = {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...fragments],
  };

  const rawRequest: Request = {
    document,
    variables: documentInfo.variableValues as Record<string, any>,
  };

  transforms = [
    ...(transforms || []),
    ...roots.map(({ args }) => AddArgumentsAsVariables(targetSchema, args)),
    FilterToSchema(targetSchema),
    AddTypenameToAbstract(targetSchema)
  ];

  const { document: query, variables } = applyRequestTransforms(rawRequest, transforms);

  return {
    query,
    variables,
    context: graphqlContext,
    operationName: documentInfo.operation && documentInfo.operation.name && documentInfo.operation.name.value
  };
}

export default async function delegateToSchema(
  targetSchema: GraphQLSchema,
  targetOperation: Operation,
  targetField: string,
  args: { [key: string]: any },
  context: { [key: string]: any },
  info: GraphQLResolveInfo,
  transforms?: Array<Transform>,
): Promise<any> {
  const processedRequest = createBatchOperation(
    targetSchema,
    targetOperation,
    {
      [targetField]: [args, info]
    },
    context,
    info,
    transforms
  );

  const errors = validate(targetSchema, processedRequest.query);
  if (errors.length > 0) {
    throw errors;
  }

  if (targetOperation === 'query' || targetOperation === 'mutation') {
    const rawResult = await execute(
      targetSchema,
      processedRequest.query,
      info.rootValue,
      context,
      processedRequest.variables,
    );

    const result = applyResultTransforms(rawResult, [
      ...(transforms || []),
      CheckResultAndHandleErrors(info, targetField),
    ]);

    return result;
  }

  if (targetOperation === 'subscription') {
    // apply result processing ???
    return subscribe(
      targetSchema,
      processedRequest.query,
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
