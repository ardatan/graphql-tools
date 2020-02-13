import { GraphQLSchema, GraphQLObjectType, getNullableType } from 'graphql';

import { healSchema, wrapFieldNode, renameFieldNode } from '../utils';
import { createMergedResolver } from '../stitching';
import { appendFields, removeFields } from '../utils/fields';
import { Request } from '../Interfaces';

import { Transform } from './transforms';
import MapFields from './MapFields';

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
        [newFieldName]: fieldNode =>
          wrapFieldNode(
            renameFieldNode(fieldNode, this.oldFieldName),
            this.pathToField,
          ),
      },
    });
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const typeMap = schema.getTypeMap();

    const innerType: GraphQLObjectType = this.pathToField.reduce(
      (acc, pathSegment) =>
        getNullableType(acc.getFields()[pathSegment].type) as GraphQLObjectType,
      typeMap[this.typeName] as GraphQLObjectType,
    );

    const targetField = removeFields(
      typeMap,
      innerType.name,
      fieldName => fieldName === this.oldFieldName,
    )[this.oldFieldName];

    const targetType = targetField.type as GraphQLObjectType;

    appendFields(typeMap, this.typeName, {
      [this.newFieldName]: {
        type: targetType,
        resolve: createMergedResolver({ fromPath: this.pathToField }),
      },
    });

    healSchema(schema);

    return this.transformer.transformSchema(schema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
