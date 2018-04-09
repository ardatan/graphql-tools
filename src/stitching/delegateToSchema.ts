import {
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
} from 'graphql';
import { FetcherOperation } from './makeRemoteExecutableSchema';
import { Request, Transform, IDelegateToSchemaOptions } from '../Interfaces';
import {
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
  options: IDelegateToSchemaOptions,
): Promise<any> {
  const processedRequest = createBatchOperation(
    options.schema,
    options.operation,
    {
      [options.fieldName]: [options.args || {}, options.info]
    },
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
