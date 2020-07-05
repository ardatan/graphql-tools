import { GraphQLSchema, GraphQLObjectType, getNullableType, FieldNode, Kind, GraphQLError } from 'graphql';

import {
  renameFieldNode,
  appendObjectFields,
  removeObjectFields,
  Transform,
  Request,
  ExecutionResult,
  relocatedError,
} from '@graphql-tools/utils';

import { defaultMergedResolver } from '@graphql-tools/delegate';

import MapFields from './MapFields';

export default class HoistField implements Transform {
  private readonly typeName: string;
  private readonly newFieldName: string;
  private readonly pathToField: Array<string>;
  private readonly oldFieldName: string;
  private readonly transformer: Transform;

  constructor(typeName: string, path: Array<string>, newFieldName: string, alias = '__gqtlw__') {
    this.typeName = typeName;
    this.newFieldName = newFieldName;

    const pathToField = path.slice();
    const oldFieldName = pathToField.pop();

    this.oldFieldName = oldFieldName;
    this.pathToField = pathToField;
    this.transformer = new MapFields(
      {
        [typeName]: {
          [newFieldName]: fieldNode => wrapFieldNode(renameFieldNode(fieldNode, oldFieldName), pathToField, alias),
        },
      },
      {
        [typeName]: value => unwrapValue(value, alias),
      },
      errors => unwrapErrors(errors, alias)
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const innerType: GraphQLObjectType = this.pathToField.reduce(
      (acc, pathSegment) => getNullableType(acc.getFields()[pathSegment].type) as GraphQLObjectType,
      schema.getType(this.typeName) as GraphQLObjectType
    );

    let [newSchema, targetFieldConfigMap] = removeObjectFields(
      schema,
      innerType.name,
      fieldName => fieldName === this.oldFieldName
    );

    const targetField = targetFieldConfigMap[this.oldFieldName];

    const targetType = targetField.type as GraphQLObjectType;

    newSchema = appendObjectFields(newSchema, this.typeName, {
      [this.newFieldName]: {
        type: targetType,
        resolve: defaultMergedResolver,
      },
    });

    return this.transformer.transformSchema(newSchema);
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}

export function wrapFieldNode(fieldNode: FieldNode, path: Array<string>, alias: string): FieldNode {
  let newFieldNode = fieldNode;
  path.forEach(fieldName => {
    newFieldNode = {
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
        selections: [fieldNode],
      },
    };
  });

  return newFieldNode;
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
