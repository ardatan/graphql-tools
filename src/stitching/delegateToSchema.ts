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
  ExecutionResult,
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
import mapAsyncIterator from './mapAsyncIterator';
import ExpandAbstractTypes from '../transforms/ExpandAbstractTypes';
import ReplaceFieldWithFragment from '../transforms/ReplaceFieldWithFragment';

export function createRequest({
  schema,
  info: documentInfo,
  operation = documentInfo.operation.operation,
  roots,
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
  ];

  if (documentInfo.schema) {
    transforms.push(new ExpandAbstractTypes(documentInfo.schema, schema));
  }

  if (documentInfo.mergeInfo && documentInfo.mergeInfo.fragments) {
    transforms.push(
      new ReplaceFieldWithFragment(schema, documentInfo.mergeInfo.fragments)
    );
  }

  transforms.push(
    new AddArgumentsAsVariables(schema, roots),
    new FilterToSchema(schema),
    new AddTypenameToAbstract(schema),
  );

  return applyRequestTransforms(rawRequest, transforms);
}

export default function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
  ...args: any[]
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
    operation = info.operation.operation,
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

  if (!options.skipValidation) {
    const errors = validate(options.schema, processedRequest.document);
    if (errors.length > 0) {
      throw errors;
    }
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
    const executionResult = await subscribe(
      schema,
      processedRequest.document,
      info.rootValue,
      context,
      processedRequest.variables,
    ) as AsyncIterator<ExecutionResult>;

    // "subscribe" to the subscription result and map the result through the transforms
    return mapAsyncIterator<ExecutionResult, any>(executionResult, (result) => {
      const transformedResult = applyResultTransforms(result, transforms);
      const subscriptionKey = Object.keys(result.data)[0];

      // for some reason the returned transformedResult needs to be nested inside the root subscription field
      // does not work otherwise...
      return {
        [subscriptionKey]: {
          ...transformedResult
        },
      };
    });
  }
}
