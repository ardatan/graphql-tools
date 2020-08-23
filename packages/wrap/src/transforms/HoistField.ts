import {
  GraphQLSchema,
  GraphQLObjectType,
  getNullableType,
  FieldNode,
  Kind,
  GraphQLError,
  GraphQLArgument,
} from 'graphql';

import {
  renameFieldNode,
  appendObjectFields,
  removeObjectFields,
  Request,
  ExecutionResult,
  relocatedError,
} from '@graphql-tools/utils';

import { Transform, defaultMergedResolver, DelegationContext } from '@graphql-tools/delegate';

import MapFields from './MapFields';

export default class HoistField implements Transform {
  private readonly typeName: string;
  private readonly newFieldName: string;
  private readonly pathToField: Array<string>;
  private readonly oldFieldName: string;
  private readonly argFilters: Array<(arg: GraphQLArgument) => boolean>;
  private readonly argLevels: Record<string, number>;
  private readonly transformer: Transform;

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
      errors => unwrapErrors(errors, alias)
    );
    this.argLevels = argLevels;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const argsMap: Record<string, GraphQLArgument> = Object.create(null);
    const innerType: GraphQLObjectType = this.pathToField.reduce((acc, pathSegment, index) => {
      const field = acc.getFields()[pathSegment];
      field.args.forEach(arg => {
        if (this.argFilters[index](arg)) {
          argsMap[arg.name] = arg;
          this.argLevels[arg.name] = index;
        }
      });
      return getNullableType(field.type) as GraphQLObjectType;
    }, schema.getType(this.typeName) as GraphQLObjectType);

    let [newSchema, targetFieldConfigMap] = removeObjectFields(
      schema,
      innerType.name,
      fieldName => fieldName === this.oldFieldName
    );

    const targetField = targetFieldConfigMap[this.oldFieldName];

    const newTargetField = {
      ...targetField,
      resolve: defaultMergedResolver,
    };

    const level = this.pathToField.length;

    Object.keys(targetField.args).forEach(argName => {
      const argConfig = targetField.args[argName];
      const arg: GraphQLArgument = {
        ...argConfig,
        name: argName,
        description: argConfig.description,
        defaultValue: argConfig.defaultValue,
        extensions: argConfig.extensions,
        astNode: argConfig.astNode,
      };
      if (this.argFilters[level](arg)) {
        argsMap[argName] = arg;
        this.argLevels[arg.name] = level;
      }
    });

    newTargetField.args = argsMap;

    newSchema = appendObjectFields(newSchema, this.typeName, {
      [this.newFieldName]: newTargetField,
    });

    return this.transformer.transformSchema(newSchema);
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
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
      arguments: fieldNode.arguments.filter(arg => argLevels[arg.name.value] === index),
    }),
    {
      ...fieldNode,
      arguments: fieldNode.arguments.filter(arg => argLevels[arg.name.value] === path.length),
    }
  );
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

function unwrapErrors(errors: ReadonlyArray<GraphQLError>, alias: string): Array<GraphQLError> {
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
