/* tslint:disable:no-unused-expression */

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLFieldConfigMap,
  GraphQLFieldConfig,
} from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';
import { hoistFieldNodes, healSchema } from '../utils';
import { defaultMergedResolver, createMergedResolver } from '../stitching';
import { default as MapFields } from './MapFields';
import { TypeMap } from 'graphql/type/schema';

export default class WrapFields implements Transform {
  private outerTypeName: string;
  private wrappingFieldNames: Array<string>;
  private wrappingTypeNames: Array<string>;
  private numWraps: number;
  private fieldNames: Array<string>;
  private delimeter: string;
  private transformer: Transform;

  constructor(
    outerTypeName: string,
    wrappingFieldNames: Array<string>,
    wrappingTypeNames: Array<string>,
    fieldNames?: Array<string>,
    delimeter: string = '__gqltf__',
  ) {
    this.outerTypeName = outerTypeName;
    this.wrappingFieldNames = wrappingFieldNames;
    this.wrappingTypeNames = wrappingTypeNames;
    this.numWraps = wrappingFieldNames.length;
    this.fieldNames = fieldNames;
    this.delimeter = delimeter;

    const remainingWrappingFieldNames = this.wrappingFieldNames.slice();
    const outerMostWrappingFieldName = remainingWrappingFieldNames.shift();
    this.transformer = new MapFields({
      [outerTypeName]: {
        [outerMostWrappingFieldName]: (fieldNode, fragments) => hoistFieldNodes({
          fieldNode,
          path: remainingWrappingFieldNames,
          fieldNames: this.fieldNames,
          fragments,
          delimeter: this.delimeter,
        }),
      },
    });
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const typeMap = schema.getTypeMap();

    const targetFields = this.filterFields(
      typeMap,
      this.outerTypeName,
      !this.fieldNames ? () => true : fieldName => this.fieldNames.includes(fieldName)
    );

    let wrapIndex = this.numWraps - 1;

    const innerMostWrappingTypeName = this.wrappingTypeNames[wrapIndex];
    this.appendFields(typeMap, innerMostWrappingTypeName, targetFields);

    for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
      this.appendFields(typeMap, this.wrappingTypeNames[wrapIndex], {
        [this.wrappingFieldNames[wrapIndex + 1]]: {
          type: typeMap[this.wrappingTypeNames[wrapIndex + 1]] as GraphQLObjectType,
          resolve: defaultMergedResolver,
        }
      });
    }

    this.appendFields(typeMap, this.outerTypeName, {
      [this.wrappingFieldNames[0]]: {
        type: typeMap[this.wrappingTypeNames[0]] as GraphQLObjectType,
        resolve: createMergedResolver({ dehoist: true, delimeter: this.delimeter }),
      },
    });

    healSchema(schema);

    return this.transformer.transformSchema(schema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }

  private appendFields(
    typeMap: TypeMap,
    typeName: string,
    fields: GraphQLFieldConfigMap<any, any>,
  ) {
    let type = typeMap[typeName];
    if (type) {
      const typeConfig = type.toConfig() as GraphQLObjectTypeConfig<any, any>;
      const originalFields = typeConfig.fields;
      const newFields = {};
      Object.keys(originalFields).forEach(fieldName => {
        newFields[fieldName] = originalFields[fieldName];
      });
      Object.keys(fields).forEach(fieldName => {
        newFields[fieldName] = fields[fieldName];
      });
      type = new GraphQLObjectType({
        ...typeConfig,
        fields: newFields,
      });
    } else {
      type = new GraphQLObjectType({
        name: typeName,
        fields,
      });
    }
    typeMap[typeName] = type;
  }

  private filterFields(
    typeMap: TypeMap,
    typeName: string,
    filter: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean,
  ): GraphQLFieldConfigMap<any, any> {
    let type = typeMap[typeName];
    const typeConfig = type.toConfig() as GraphQLObjectTypeConfig<any, any>;
    const originalFields = typeConfig.fields;
    const newFields = {};
    const filteredFields = {};
    Object.keys(originalFields).forEach(fieldName => {
      if (filter(fieldName, originalFields[fieldName])) {
        filteredFields[fieldName] = originalFields[fieldName];
      } else {
        newFields[fieldName] = originalFields[fieldName];
      }
    });
    type = new GraphQLObjectType({
      ...typeConfig,
      fields: newFields,
    });
    typeMap[typeName] = type;

    return filteredFields;
  }
}
