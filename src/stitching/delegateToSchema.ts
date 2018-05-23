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
} from 'graphql';

import {
  Request,
  IDelegateToSchemaOptions,
  ICreateRequestOptions
} from '../Interfaces';

import {
  applyRequestTransforms,
  applyResultTransforms
} from '../transforms/transforms';

import AddArgumentsAsVariables from '../transforms/AddArgumentsAsVariables';
import FilterToSchema from '../transforms/FilterToSchema';
import AddTypenameToAbstract from '../transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from '../transforms/CheckResultAndHandleErrors';


export function createRequest({
  schema,
  operation,
  roots,
  info: documentInfo,
  transforms
}: ICreateRequestOptions): Request {
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
    operation,
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
    new AddArgumentsAsVariables(schema, roots),
    new FilterToSchema(schema),
    new AddTypenameToAbstract(schema),
  ];

  return applyRequestTransforms(rawRequest, transforms);
}

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
  const {
    info,
    args = {},
    fieldName,
    schema,
    operation,
    context
   } = options;
  const processedRequest = createRequest({
    schema,
    operation,
    roots: [
      {
        fieldName,
        args,
        info
      }
    ],
    info,
    transforms: options.transforms
  });

  const errors = validate(schema, processedRequest.document);
  if (errors.length > 0) {
    throw errors;
  }

  const transforms = [
    ...(options.transforms || []),
    new CheckResultAndHandleErrors(info, fieldName),
  ];

  if (operation === 'query' || operation === 'mutation') {
    return applyResultTransforms(
      await execute(
        schema,
        processedRequest.document,
        info.rootValue,
        context,
        processedRequest.variables,
      ),
      transforms,
    );
  }

  if (operation === 'subscription') {
    // apply result processing ???
    return subscribe(
      schema,
      processedRequest.document,
      info.rootValue,
      context,
      processedRequest.variables,
    );
  }
}
