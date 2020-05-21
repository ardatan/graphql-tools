import { GraphQLSchema, GraphQLObjectType } from 'graphql';

import {
  Transform,
  Request,
  hoistFieldNodes,
  appendObjectFields,
  selectObjectFields,
  modifyObjectFields,
} from '@graphql-tools/utils';
import { createMergedResolver, defaultMergedResolver } from '@graphql-tools/delegate';

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
    fieldNames?: Array<string>
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
    const targetFieldConfigMap = selectObjectFields(
      schema,
      this.outerTypeName,
      !this.fieldNames ? () => true : fieldName => this.fieldNames.includes(fieldName)
    );

    let wrapIndex = this.numWraps - 1;
    let wrappingTypeName = this.wrappingTypeNames[wrapIndex];
    let wrappingFieldName = this.wrappingFieldNames[wrapIndex];

    let newSchema = appendObjectFields(schema, wrappingTypeName, targetFieldConfigMap);

    for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
      const nextWrappingTypeName = this.wrappingTypeNames[wrapIndex];

      newSchema = appendObjectFields(newSchema, nextWrappingTypeName, {
        [wrappingFieldName]: {
          type: newSchema.getType(wrappingTypeName) as GraphQLObjectType,
          resolve: defaultMergedResolver,
        },
      });

      wrappingTypeName = nextWrappingTypeName;
      wrappingFieldName = this.wrappingFieldNames[wrapIndex];
    }

    const selectedFieldNames = Object.keys(targetFieldConfigMap);
    [newSchema] = modifyObjectFields(
      newSchema,
      this.outerTypeName,
      fieldName => selectedFieldNames.includes(fieldName),
      {
        [wrappingFieldName]: {
          type: newSchema.getType(wrappingTypeName) as GraphQLObjectType,
          resolve: createMergedResolver({ dehoist: true }),
        },
      }
    );

    return this.transformer.transformSchema(newSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
