import {
  GraphQLSchema,
  GraphQLObjectType,
  getNullableType,
  FieldNode,
  Kind,
  GraphQLError,
  GraphQLArgument,
  GraphQLFieldResolver,
  OperationTypeNode,
  isListType,
  getNamedType,
  GraphQLList,
} from 'graphql';

import {
  appendObjectFields,
  removeObjectFields,
  ExecutionRequest,
  ExecutionResult,
  relocatedError,
} from '@graphql-tools/utils';

import { Transform, defaultMergedResolver, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { defaultCreateProxyingResolver } from '../generateProxyingResolvers.js';

import MapFields from './MapFields.js';

interface HoistFieldTransformationContext extends Record<string, any> {}

export default class HoistField<TContext extends Record<string, any> = Record<string, any>>
  implements Transform<HoistFieldTransformationContext, TContext>
{
  private readonly typeName: string;
  private readonly newFieldName: string;
  private readonly pathToField: Array<string>;
  private readonly oldFieldName: string;
  private readonly argFilters: Array<(arg: GraphQLArgument) => boolean>;
  private readonly argLevels: Record<string, number>;
  private readonly transformer: MapFields<TContext>;

  constructor(
    typeName: string,
    pathConfig: Array<string | { fieldName: string; argFilter?: (arg: GraphQLArgument) => boolean }>,
    newFieldName: string,
    alias = '__gqtlw__'
  ) {
    this.typeName = typeName;
    this.newFieldName = newFieldName;

    const path = pathConfig.map(segment => (typeof segment === 'string' ? segment : segment.fieldName));
    this.argFilters = pathConfig.map((segment, index) => {
      if (typeof segment === 'string' || segment.argFilter == null) {
        return index === pathConfig.length - 1 ? () => true : () => false;
      }
      return segment.argFilter;
    });

    const pathToField = path.slice();
    const oldFieldName = pathToField.pop();

    if (oldFieldName == null) {
      throw new Error(`Cannot hoist field to ${newFieldName} on type ${typeName}, no path provided.`);
    }

    this.oldFieldName = oldFieldName;
    this.pathToField = pathToField;
    const argLevels = Object.create(null);
    this.transformer = new MapFields(
      {
        [typeName]: {
          [newFieldName]: fieldNode =>
            wrapFieldNode(renameFieldNode(fieldNode, oldFieldName), pathToField, alias, argLevels),
        },
      },
      {
        [typeName]: value => unwrapValue(value, alias),
      },
      errors => (errors != null ? unwrapErrors(errors, alias) : undefined)
    );
    this.argLevels = argLevels;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    const argsMap: Record<string, GraphQLArgument> = Object.create(null);
    let isList = false;
    const innerType: GraphQLObjectType = this.pathToField.reduce((acc, pathSegment, index) => {
      const field = acc.getFields()[pathSegment];
      for (const arg of field.args) {
        if (this.argFilters[index](arg)) {
          argsMap[arg.name] = arg;
          this.argLevels[arg.name] = index;
        }
      }
      const nullableType = getNullableType(field.type);
      if (isListType(nullableType)) {
        isList = true;
        return getNamedType(nullableType) as any;
      }

      return nullableType as GraphQLObjectType;
    }, originalWrappingSchema.getType(this.typeName) as GraphQLObjectType);

    let [newSchema, targetFieldConfigMap] = removeObjectFields(
      originalWrappingSchema,
      innerType.name,
      fieldName => fieldName === this.oldFieldName
    );

    const targetField = targetFieldConfigMap[this.oldFieldName];

    let resolve: GraphQLFieldResolver<any, any>;
    const hoistingToRootField =
      this.typeName === originalWrappingSchema.getQueryType()?.name ||
      this.typeName === originalWrappingSchema.getMutationType()?.name;

    if (hoistingToRootField) {
      const targetSchema = subschemaConfig.schema;
      const operation = this.typeName === targetSchema.getQueryType()?.name ? 'query' : 'mutation';
      const createProxyingResolver = subschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;
      resolve = createProxyingResolver({
        subschemaConfig,
        operation: operation as OperationTypeNode,
        fieldName: this.newFieldName,
      });
    } else {
      resolve = defaultMergedResolver;
    }

    const newTargetField = {
      ...targetField,
      resolve: resolve!,
    };

    const level = this.pathToField.length;

    const args = targetField.args;
    if (args != null) {
      for (const argName in args) {
        const argConfig = args[argName];
        if (argConfig == null) {
          continue;
        }
        const arg = {
          ...argConfig,
          name: argName,
          description: argConfig.description,
          defaultValue: argConfig.defaultValue,
          extensions: argConfig.extensions,
          astNode: argConfig.astNode,
        } as GraphQLArgument;
        if (this.argFilters[level](arg)) {
          argsMap[argName] = arg;
          this.argLevels[arg.name] = level;
        }
      }
    }

    newTargetField.args = argsMap;

    if (isList) {
      newTargetField.type = new GraphQLList(newTargetField.type);
      const resolver = newTargetField.resolve;
      newTargetField.resolve = (parent, args, context, info) =>
        Promise.all(
          Object.keys(parent)
            .filter(key => !isNaN(parseInt(key, 10)))
            .map(key => resolver(parent[key], args, context, info))
        );
    }

    newSchema = appendObjectFields(newSchema, this.typeName, {
      [this.newFieldName]: newTargetField,
    });

    return this.transformer.transformSchema(newSchema, subschemaConfig);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: HoistFieldTransformationContext
  ): ExecutionRequest {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: HoistFieldTransformationContext
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}

export function wrapFieldNode(
  fieldNode: FieldNode,
  path: Array<string>,
  alias: string,
  argLevels: Record<string, number>
): FieldNode {
  return path.reduceRight(
    (acc, fieldName, index) => ({
      kind: Kind.FIELD,
      alias: {
        kind: Kind.NAME,
        value: alias,
      },
      name: {
        kind: Kind.NAME,
        value: fieldName,
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [acc],
      },
      arguments:
        fieldNode.arguments != null
          ? fieldNode.arguments.filter(arg => argLevels[arg.name.value] === index)
          : undefined,
    }),
    {
      ...fieldNode,
      arguments:
        fieldNode.arguments != null
          ? fieldNode.arguments.filter(arg => argLevels[arg.name.value] === path.length)
          : undefined,
    }
  );
}

export function renameFieldNode(fieldNode: FieldNode, name: string): FieldNode {
  return {
    ...fieldNode,
    alias: {
      kind: Kind.NAME,
      value: fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value,
    },
    name: {
      kind: Kind.NAME,
      value: name,
    },
  };
}

export function unwrapValue(originalValue: any, alias: string): any {
  let newValue = originalValue;

  let object = newValue[alias];
  while (object != null) {
    newValue = object;
    object = newValue[alias];
  }

  delete originalValue[alias];
  Object.assign(originalValue, newValue);

  return originalValue;
}

function unwrapErrors(errors: ReadonlyArray<GraphQLError> | undefined, alias: string): Array<GraphQLError> | undefined {
  if (errors === undefined) {
    return undefined;
  }

  return errors.map(error => {
    const originalPath = error.path;
    if (originalPath == null) {
      return error;
    }

    const newPath = originalPath.filter(pathSegment => pathSegment !== alias);

    return relocatedError(error, newPath);
  });
}
