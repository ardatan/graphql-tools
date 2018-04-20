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
  print,
  GraphQLResolveInfo,
  InlineFragmentNode,
  GraphQLSchema,
} from 'graphql';
import {
  Request,
  IDelegateToSchemaOptions,
  Transform,
  OperationRootDefinition,
} from '../Interfaces';
import {
  applyRequestTransforms,
  applyResultTransforms
} from '../transforms/transforms';
import AddArgumentsAsVariables from '../transforms/AddArgumentsAsVariables';
import FilterToSchema from '../transforms/FilterToSchema';
import AddTypenameToAbstract from '../transforms/AddTypenameToAbstract';
import CheckResultAndHandleErrors from '../transforms/CheckResultAndHandleErrors';
import ReplaceFieldWithFragment from '../transforms/ReplaceFieldWithFragment';

export function createRequest(
  targetSchema: GraphQLSchema,
  targetOperation: 'query' | 'mutation' | 'subscription',
  roots: Array<OperationRootDefinition>,
  documentInfo: GraphQLResolveInfo,
  transforms?: Array<Transform>,
): Request {
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
    new AddArgumentsAsVariables(targetSchema, roots),
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
  ];

  return applyRequestTransforms(rawRequest, transforms);
}

export default async function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
  ...args: Array<any>
): Promise<any>;
export default async function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
  args: { [key: string]: any },
  context: { [key: string]: any },
  info: GraphQLResolveInfo,
  transforms?: Array<Transform>,
): Promise<any> {
  if (options instanceof GraphQLSchema) {
    const schema = options;
    console.warn(
      'Argument list is a deprecated. Pass object of parameters ' +
        'to delegate to schema',
    );
    const fragments: Array<{ field: string; fragment: string }> = [];
    Object.keys(fragmentReplacements).forEach(typeName => {
      const typeFragments = fragmentReplacements[typeName];
      Object.keys(typeFragments).forEach(field => {
        fragments.push({ field, fragment: print(typeFragments[field]) });
      });
    });
    const newOptions: IDelegateToSchemaOptions = {
      schema,
      operation,
      fieldName,
      args,
      context,
      info,
      transforms: [
        new ReplaceFieldWithFragment(schema, fragments),
        ...(transforms || []),
      ],
    };
    return delegateToSchemaImplementation(newOptions);
  } else {
    return delegateToSchemaImplementation(options);
  }
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
  const processedRequest = createRequest(
    schema,
    operation,
    [
      {
        fieldName,
        args,
        info
      }
    ],
    info,
    options.transforms
  );

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
