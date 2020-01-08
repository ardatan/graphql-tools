/* tslint:disable:no-unused-expression */

import {
  GraphQLSchema,
  GraphQLObjectType,
  getNullableType,
} from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';
import { healSchema, wrapFieldNode, renameFieldNode } from '../utils';
import { createMergedResolver } from '../stitching';
import { default as MapFields } from './MapFields';
import { appendFields, removeFields } from '../utils/fields';

export default class HoistField implements Transform {
  private typeName: string;
  private path: Array<string>;
  private newFieldName: string;
  private pathToField: Array<string>;
  private oldFieldName: string;
  private transformer: Transform;

  constructor(
    typeName: string,
    path: Array<string>,
    newFieldName: string,
  ) {
    this.typeName = typeName;
    this.path = path;
    this.newFieldName = newFieldName;

    this.pathToField = this.path.slice();
    this.oldFieldName = this.pathToField.pop();
    this.transformer = new MapFields({
      [typeName]: {
        [newFieldName]: fieldNode => wrapFieldNode(
          renameFieldNode(fieldNode, this.oldFieldName),
          this.pathToField,
        ),
      },
    });
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const typeMap = schema.getTypeMap();

    const innerType: GraphQLObjectType<any, any> = this.pathToField.reduce(
      (acc, pathSegment) =>
        getNullableType(acc.getFields()[pathSegment].type) as GraphQLObjectType<any, any>,
      typeMap[this.typeName] as GraphQLObjectType<any, any>
    );

    const targetField = removeFields(
      typeMap,
      innerType.name,
      fieldName => fieldName === this.oldFieldName,
    )[this.oldFieldName];

    const targetType = (targetField.type as GraphQLObjectType<any, any>);

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
