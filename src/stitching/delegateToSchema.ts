import {
  ArgumentNode,
  FieldNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  subscribe,
  execute,
  validate,
  GraphQLSchema,
  ExecutionResult,
  GraphQLObjectType,
  OperationTypeNode,
  typeFromAST,
  NamedTypeNode,
  GraphQLInputType,
  GraphQLField,
  GraphQLArgument,
  VariableDefinitionNode,
  GraphQLList,
  GraphQLNonNull,
  TypeNode,
} from 'graphql';

import {
  IDelegateToSchemaOptions,
  ICreateRequestFromInfo,
  IDelegateRequestOptions,
  Operation,
  Request,
  Fetcher,
  Delegator,
  SubschemaConfig,
  isSubschemaConfig,
} from '../Interfaces';

import {
  ExpandAbstractTypes,
  FilterToSchema,
  AddReplacementFragments,
  AddMergedTypeFragments,
  AddTypenameToAbstract,
  CheckResultAndHandleErrors,
  applyRequestTransforms,
  applyResultTransforms,
} from '../transforms';

import { serializeInputValue } from '../utils';

import { ApolloLink, execute as executeLink } from 'apollo-link';
import linkToFetcher from './linkToFetcher';
import { observableToAsyncIterable } from './observableToAsyncIterable';
import { isAsyncIterable } from 'iterall';
import mapAsyncIterator from './mapAsyncIterator';

function getDelegatingOperation(
  parentType: GraphQLObjectType,
  schema: GraphQLSchema
): OperationTypeNode {
  if (parentType === schema.getMutationType()) {
    return 'mutation';
  } else if (parentType === schema.getSubscriptionType()) {
    return 'subscription';
  } else {
    return 'query';
  }
}

export default function delegateToSchema(
  options: IDelegateToSchemaOptions | GraphQLSchema,
): any {
  if (options instanceof GraphQLSchema) {
    throw new Error(
      'Passing positional arguments to delegateToSchema is deprecated. ' +
        'Please pass named parameters instead.',
    );
  }

  const {
    schema: subschemaOrSubschemaConfig,
    info,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    returnType = info.returnType,
    args,
    fieldNodes = info.fieldNodes,
  } = options;

  const request = createRequestFromInfo({
    info,
    schema: subschemaOrSubschemaConfig,
    operation,
    fieldName,
    additionalArgs: args,
    fieldNodes,
  });

  return delegateRequest({
    ...options,
    request,
    operation,
    fieldName,
    returnType,
  });
}

export function delegateRequest({
  request,
  schema: subschema,
  rootValue,
  info,
  operation = getDelegatingOperation(info.parentType, info.schema),
  fieldName = info.fieldName,
  fieldNodes = info.fieldNodes,
  returnType = info.returnType,
  context,
  transforms = [],
  skipValidation,
  skipTypeMerging,
}: IDelegateRequestOptions): any {
  let targetSchema: GraphQLSchema;
  let subschemaConfig: SubschemaConfig;

  if (isSubschemaConfig(subschema)) {
    subschemaConfig = subschema;
    targetSchema = subschemaConfig.schema;
    rootValue = rootValue || subschemaConfig.rootValue || info.rootValue;
    transforms = transforms.concat((subschemaConfig.transforms || []).slice().reverse());
  } else {
    targetSchema = subschema;
    rootValue = rootValue || info.rootValue;
  }

  transforms = [
    new CheckResultAndHandleErrors(info, fieldName, subschema, context, returnType, skipTypeMerging),
    ...transforms,
    new ExpandAbstractTypes(info.schema, targetSchema),
  ];

  if (info.mergeInfo) {
    transforms.push(
      new AddReplacementFragments(targetSchema, info.mergeInfo.replacementFragments),
      new AddMergedTypeFragments(targetSchema, info.mergeInfo.mergedTypes),
    );
  }

  transforms.push(
    new FilterToSchema(targetSchema),
    new AddTypenameToAbstract(targetSchema),
  );

  request = applyRequestTransforms(request, transforms);

  if (!skipValidation) {
    const errors = validate(targetSchema, request.document);
    if (errors.length > 0) {
      throw errors;
    }
  }

  if (operation === 'query' || operation === 'mutation') {

    const executor = createExecutor(targetSchema, rootValue, subschemaConfig);

    const executionResult: ExecutionResult | Promise<ExecutionResult> = executor({
      document: request.document,
      context,
      variables: request.variables
    });

    if (executionResult instanceof Promise) {
      return executionResult.then((originalResult: any) => applyResultTransforms(originalResult, transforms));
    } else {
      return applyResultTransforms(executionResult, transforms);
    }

  } else if (operation === 'subscription') {

    const subscriber = createSubscriber(targetSchema, rootValue, subschemaConfig);

    return subscriber({
      document: request.document,
      context,
      variables: request.variables,
    }).then((subscriptionResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => {
      if (isAsyncIterable(subscriptionResult)) {
        // "subscribe" to the subscription result and map the result through the transforms
        return mapAsyncIterator<ExecutionResult, any>(subscriptionResult, result => {
          const transformedResult = applyResultTransforms(result, transforms);
          // wrap with fieldName to return for an additional round of resolutioon
          // with payload as rootValue
          return {
            [info.fieldName]: transformedResult,
          };
        });
      } else {
        return applyResultTransforms(subscriptionResult, transforms);
      }
    });

  }
}

export function createRequestFromInfo({
  info,
  schema,
  operation = getDelegatingOperation(info.parentType, info.schema),
  fieldName = info.fieldName,
  additionalArgs,
  fieldNodes = info.fieldNodes,
}: ICreateRequestFromInfo): Request {
  return createRequest(
    info.schema,
    info.fragments,
    info.operation.variableDefinitions,
    info.variableValues,
    schema,
    operation,
    fieldName,
    additionalArgs,
    fieldNodes,
  );
}

export function createRequest(
  sourceSchema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
  variableValues: Record<string, any>,
  targetSchemaOrSchemaConfig: GraphQLSchema | SubschemaConfig,
  targetOperation: Operation,
  targetField: string,
  additionalArgs: Record<string, any>,
  fieldNodes: ReadonlyArray<FieldNode>,
): Request {
  let selections: Array<SelectionNode> = [];
  const originalSelections: ReadonlyArray<SelectionNode> = fieldNodes;
  originalSelections.forEach((field: FieldNode) => {
    const fieldSelections = field.selectionSet
      ? field.selectionSet.selections
      : [];
    selections = selections.concat(fieldSelections);
  });

  let selectionSet = undefined;
  if (selections.length > 0) {
    selectionSet = {
      kind: Kind.SELECTION_SET,
      selections: selections,
    };
  }

  let variables = {};
  for (const variableDefinition of variableDefinitions) {
    const varName = variableDefinition.variable.name.value;
    const varType = typeFromAST(sourceSchema, (variableDefinition.type as NamedTypeNode)) as GraphQLInputType;
    variables[varName] = serializeInputValue(varType, variableValues[varName]);
  }

  let args = fieldNodes[0].arguments;
  if (additionalArgs) {
    const {
      arguments: updatedArguments,
      variableDefinitions: updatedVariableDefinitions,
      variableValues: updatedVariableValues
    } = updateArguments(
      targetSchemaOrSchemaConfig,
      targetOperation,
      targetField,
      args,
      variableDefinitions,
      variables,
      additionalArgs,
      );
    args = updatedArguments;
    variableDefinitions = updatedVariableDefinitions;
    variables = updatedVariableValues;
  }

  const fieldNode: FieldNode = {
    kind: Kind.FIELD,
    alias: null,
    arguments: args,
    selectionSet,
    name: {
      kind: Kind.NAME,
      value: targetField || fieldNodes[0].name.value,
    },
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation,
    variableDefinitions,
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [fieldNode],
    },
  };

  const fragmentDefinitions: Array<FragmentDefinitionNode> = Object.keys(fragments).map(
    fragmentName => fragments[fragmentName],
  );

  const document = {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...fragmentDefinitions],
  };

  return {
    document,
    variables,
  };
}

function updateArguments(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  operation: OperationTypeNode,
  fieldName: string,
  argumentNodes: ReadonlyArray<ArgumentNode>,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
  variableValues: Record<string, any>,
  newArgsMap: Record<string, any>,
): {
  arguments: Array<ArgumentNode>,
  variableDefinitions: Array<VariableDefinitionNode>,
  variableValues: Record<string, any>
} {
  const schema = isSubschemaConfig(subschemaOrSubschemaConfig) ?
    subschemaOrSubschemaConfig.schema : subschemaOrSubschemaConfig;

  let type: GraphQLObjectType;
  if (operation === 'subscription') {
    type = schema.getSubscriptionType();
  } else if (operation === 'mutation') {
    type = schema.getMutationType();
  } else {
    type = schema.getQueryType();
  }

  const newArgs: Record<string, ArgumentNode> = {};
  if (argumentNodes) {
    argumentNodes.forEach((argument: ArgumentNode) => {
      newArgs[argument.name.value] = argument;
    });
  }

  let varNames = variableDefinitions.reduce((acc, def) => {
    acc[def.variable.name.value] = true;
    return acc;
  }, {});

  const variables = {};
  let numGeneratedVariables = 0;

  const field: GraphQLField<any, any> = type.getFields()[fieldName];
  field.args.forEach((argument: GraphQLArgument) => {
    if (newArgsMap[argument.name]) {
      const argName = argument.name;
      let varName;
      do {
        varName = `_v${numGeneratedVariables++}_${argName}`;
      } while (varNames[varName]);

      newArgs[argument.name] = {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: argument.name,
        },
        value: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: varName,
          },
        },
      };
      varNames[varName] = true;
      variables[varName] = {
        kind: Kind.VARIABLE_DEFINITION,
        variable: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: varName,
          },
        },
        type: typeToAst(argument.type),
      };
      variableValues[varName] = serializeInputValue(
        argument.type,
        newArgsMap[argument.name],
      );
    }
  });

  return {
    arguments: Object.keys(newArgs).map(argName => newArgs[argName]),
    variableDefinitions: variableDefinitions.concat(
      Object.keys(variables).map(varName => variables[varName]),
    ),
    variableValues,
  };
}

function typeToAst(type: GraphQLInputType): TypeNode {
  if (type instanceof GraphQLNonNull) {
    const innerType = typeToAst(type.ofType);
    if (
      innerType.kind === Kind.LIST_TYPE ||
      innerType.kind === Kind.NAMED_TYPE
    ) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type: innerType,
      };
    } else {
      throw new Error('Incorrent inner non-null type');
    }
  } else if (type instanceof GraphQLList) {
    return {
      kind: Kind.LIST_TYPE,
      type: typeToAst(type.ofType),
    };
  } else {
    return {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.toString(),
      },
    };
  }
}

function createExecutor(
  schema: GraphQLSchema,
  rootValue: Record<string, any>,
  subschemaConfig?: SubschemaConfig
): Delegator {
  let fetcher: Fetcher;
  if (subschemaConfig) {
    if (subschemaConfig.dispatcher) {
      const dynamicLinkOrFetcher = subschemaConfig.dispatcher(context);
      fetcher = (typeof dynamicLinkOrFetcher === 'function') ?
        dynamicLinkOrFetcher :
        linkToFetcher(dynamicLinkOrFetcher);
    } else if (subschemaConfig.link) {
      fetcher = linkToFetcher(subschemaConfig.link);
    } else if (subschemaConfig.fetcher) {
      fetcher = subschemaConfig.fetcher;
    }

    if (!fetcher && !rootValue && subschemaConfig.rootValue) {
      rootValue = subschemaConfig.rootValue;
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
  subschemaConfig?: SubschemaConfig
): Delegator {
  let link: ApolloLink;

  if (subschemaConfig) {
    if (subschemaConfig.dispatcher) {
      link = subschemaConfig.dispatcher(context) as ApolloLink;
    } else if (subschemaConfig.link) {
      link = subschemaConfig.link;
    }

    if (!link && !rootValue && subschemaConfig.rootValue) {
      rootValue = subschemaConfig.rootValue;
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
