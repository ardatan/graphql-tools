import { GraphQLSchema, GraphQLObjectType } from 'graphql';

import { Transform, Request, hoistFieldNodes, getFields, modifyFields } from '@graphql-tools/utils';
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
    let targetFieldConfigMap = getFields(
      schema,
      this.outerTypeName,
      !this.fieldNames ? () => true : fieldName => this.fieldNames.includes(fieldName)
    );

    const innerMostFieldNames = Object.keys(targetFieldConfigMap);

    const remove = [
      {
        typeName: this.outerTypeName,
        testFn: (fieldName: string) => innerMostFieldNames.includes(fieldName),
      },
    ];

    let wrapIndex = this.numWraps - 1;

    const innerMostWrappingTypeName = this.wrappingTypeNames[wrapIndex];

    let baseWrappingType = new GraphQLObjectType({
      name: innerMostWrappingTypeName,
      fields: targetFieldConfigMap,
    });

    // Appending is still necessary to support wrapping with a pre-existing type.
    // modifyFields lets you use the incomplete type within a field config map
    // as it employes rewiring and will use the correct final type.
    //
    // In fact, the baseWrappingType could even be a stub type with no fields
    // as long as it has the correct name.

    const append = [
      {
        typeName: innerMostWrappingTypeName,
        additionalFields: targetFieldConfigMap,
      },
    ];

    for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
      targetFieldConfigMap = {
        [this.wrappingFieldNames[wrapIndex + 1]]: {
          type: baseWrappingType,
          resolve: defaultMergedResolver,
        },
      };

      const wrappingTypeName = this.wrappingTypeNames[wrapIndex];

      baseWrappingType = new GraphQLObjectType({
        name: wrappingTypeName,
        fields: targetFieldConfigMap,
      });

      append.push({
        typeName: wrappingTypeName,
        additionalFields: targetFieldConfigMap,
      });
    }

    append.push({
      typeName: this.outerTypeName,
      additionalFields: {
        [this.wrappingFieldNames[0]]: {
          type: baseWrappingType,
          resolve: createMergedResolver({ dehoist: true }),
        },
      },
    });

    const newSchema = modifyFields(schema, { append, remove });

    return this.transformer.transformSchema(newSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
