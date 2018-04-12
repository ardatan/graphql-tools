import {
  FieldNode,
  ArgumentNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  SelectionNode,
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  GraphQLResolveInfo
} from 'graphql';
import { FetcherOperation } from './makeRemoteExecutableSchema';
import { Request, Transform, IDelegateToSchemaOptions, OperationRootDefinition } from '../Interfaces';
import { applyRequestTransforms, applyResultTransforms } from '../transforms/transforms';
import AddArgumentsAsVariables from '../transforms/AddArgumentsAsVariables';
import FilterToSchema from '../transforms/FilterToSchema';
import AddTypenameToAbstract from '../transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from '../transforms/CheckResultAndHandleErrors';

export function createOperation(
  targetSchema: GraphQLSchema,
  targetOperation: 'query' | 'mutation' | 'subscription',
  roots: Array<OperationRootDefinition>,
  graphqlContext: { [key: string]: any },
  documentInfo: GraphQLResolveInfo,
  transforms?: Array<Transform>,
): FetcherOperation {
  const selections: Array<SelectionNode> = roots.map(({ fieldName, info, alias }) => {
    const newSelections: Array<SelectionNode> = info
      ? [].concat(...info.fieldNodes.map((field: FieldNode) => field.selectionSet ? field.selectionSet.selections : []))
      : [];

    const args: Array<ArgumentNode> = info
      ? [].concat( ...info.fieldNodes.map((field: FieldNode) => field.arguments || []))
      : [];

    const rootSelectionSet = newSelections.length > 0
      ? {
        kind: Kind.SELECTION_SET,
        selections: newSelections
      }
      : null;

    const rootField: FieldNode = {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: fieldName,
      },
      alias: alias
       ? {
         kind: Kind.NAME,
         value: alias
       }
       : null,
       selectionSet: rootSelectionSet,
       arguments: args
    };

    return rootField;
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
    AddArgumentsAsVariables(targetSchema, roots),
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
  options: IDelegateToSchemaOptions,
): Promise<any> {
  const processedRequest = createOperation(
    options.schema,
    options.operation,
    [
      {
        fieldName: options.fieldName,
        args: options.args || {},
        info: options.info
      }
    ],
    options.context,
    options.info,
    options.transforms
  );

  const errors = validate(options.schema, processedRequest.query);
  if (errors.length > 0) {
    throw errors;
  }

  if (options.operation === 'query' || options.operation === 'mutation') {
    const rawResult = await execute(
      options.schema,
      processedRequest.query,
      options.info.rootValue,
      options.context,
      processedRequest.variables,
    );

    const result = applyResultTransforms(rawResult, [
      ...(options.transforms || []),
      CheckResultAndHandleErrors(options.info, options.fieldName),
    ]);

    return result;
  }

  if (options.operation === 'subscription') {
    // apply result processing ???
    return subscribe(
      options.schema,
      processedRequest.query,
      options.info.rootValue,
      options.context,
      processedRequest.variables,
    );
  }
}
