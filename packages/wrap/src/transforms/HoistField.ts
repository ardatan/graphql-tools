import { GraphQLSchema, GraphQLObjectType, getNullableType } from 'graphql';

import { wrapFieldNode, renameFieldNode, appendFields, removeFields, Transform, Request } from '@graphql-tools/utils';

import MapFields from './MapFields';
import { createMergedResolver } from '@graphql-tools/delegate';

export default class HoistField implements Transform {
  private readonly typeName: string;
  private readonly path: Array<string>;
  private readonly newFieldName: string;
  private readonly pathToField: Array<string>;
  private readonly oldFieldName: string;
  private readonly transformer: Transform;

  constructor(typeName: string, path: Array<string>, newFieldName: string) {
    this.typeName = typeName;
    this.path = path;
    this.newFieldName = newFieldName;

    this.pathToField = this.path.slice();
    this.oldFieldName = this.pathToField.pop();
    this.transformer = new MapFields({
      [typeName]: {
        [newFieldName]: fieldNode => wrapFieldNode(renameFieldNode(fieldNode, this.oldFieldName), this.pathToField),
      },
    });
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const innerType: GraphQLObjectType = this.pathToField.reduce(
      (acc, pathSegment) => getNullableType(acc.getFields()[pathSegment].type) as GraphQLObjectType,
      schema.getType(this.typeName) as GraphQLObjectType
    );

    let [newSchema, targetFieldConfigMap] = removeFields(
      schema,
      innerType.name,
      fieldName => fieldName === this.oldFieldName
    );

    const targetField = targetFieldConfigMap[this.oldFieldName];

    const targetType = targetField.type as GraphQLObjectType;

    newSchema = appendFields(newSchema, this.typeName, {
      [this.newFieldName]: {
        type: targetType,
        resolve: createMergedResolver({ fromPath: this.pathToField }),
      },
    });

    return this.transformer.transformSchema(newSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
