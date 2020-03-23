import { GraphQLSchema, GraphQLObjectType } from 'graphql';

import { Transform, Request } from '../../Interfaces';
import {
  hoistFieldNodes,
  healSchema,
  appendFields,
  removeFields,
} from '../../utils/index';
import {
  defaultMergedResolver,
  createMergedResolver,
} from '../../stitch/index';

import MapFields from './MapFields';

export default class WrapFields implements Transform {
  private readonly outerTypeName: string;
  private readonly wrappingFieldNames: Array<string>;
  private readonly wrappingTypeNames: Array<string>;
  private readonly numWraps: number;
  private readonly fieldNames: Array<string>;
  private readonly transformer: Transform;

  constructor(
    outerTypeName: string,
    wrappingFieldNames: Array<string>,
    wrappingTypeNames: Array<string>,
    fieldNames?: Array<string>,
  ) {
    this.outerTypeName = outerTypeName;
    this.wrappingFieldNames = wrappingFieldNames;
    this.wrappingTypeNames = wrappingTypeNames;
    this.numWraps = wrappingFieldNames.length;
    this.fieldNames = fieldNames;

    const remainingWrappingFieldNames = this.wrappingFieldNames.slice();
    const outerMostWrappingFieldName = remainingWrappingFieldNames.shift();
    this.transformer = new MapFields({
      [outerTypeName]: {
        [outerMostWrappingFieldName]: (fieldNode, fragments) =>
          hoistFieldNodes({
            fieldNode,
            path: remainingWrappingFieldNames,
            fieldNames: this.fieldNames,
            fragments,
          }),
      },
    });
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const typeMap = schema.getTypeMap();

    const targetFields = removeFields(
      typeMap,
      this.outerTypeName,
      !this.fieldNames
        ? () => true
        : fieldName => this.fieldNames.includes(fieldName),
    );

    let wrapIndex = this.numWraps - 1;

    const innerMostWrappingTypeName = this.wrappingTypeNames[wrapIndex];
    appendFields(typeMap, innerMostWrappingTypeName, targetFields);

    for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
      appendFields(typeMap, this.wrappingTypeNames[wrapIndex], {
        [this.wrappingFieldNames[wrapIndex + 1]]: {
          type: typeMap[
            this.wrappingTypeNames[wrapIndex + 1]
          ] as GraphQLObjectType,
          resolve: defaultMergedResolver,
        },
      });
    }

    appendFields(typeMap, this.outerTypeName, {
      [this.wrappingFieldNames[0]]: {
        type: typeMap[this.wrappingTypeNames[0]] as GraphQLObjectType,
        resolve: createMergedResolver({ dehoist: true }),
      },
    });

    healSchema(schema);

    return this.transformer.transformSchema(schema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
