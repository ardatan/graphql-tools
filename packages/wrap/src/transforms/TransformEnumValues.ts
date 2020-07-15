import { GraphQLSchema, GraphQLEnumValueConfig, ExecutionResult } from 'graphql';

import { Transform, Request, MapperKind, mapSchema } from '@graphql-tools/utils';

import { EnumValueTransformer, LeafValueTransformer } from '../types';

import MapLeafValues, { MapLeafValuesTransformationContext } from './MapLeafValues';

export default class TransformEnumValues implements Transform {
  private readonly enumValueTransformer: EnumValueTransformer;
  private readonly transformer: MapLeafValues;
  private transformedSchema: GraphQLSchema;
  private mapping: Record<string, Record<string, string>>;
  private reverseMapping: Record<string, Record<string, string>>;

  constructor(
    enumValueTransformer: EnumValueTransformer,
    inputValueTransformer?: LeafValueTransformer,
    outputValueTransformer?: LeafValueTransformer
  ) {
    this.enumValueTransformer = enumValueTransformer;
    this.mapping = Object.create(null);
    this.reverseMapping = Object.create(null);
    this.transformer = new MapLeafValues(
      generateInputValueTransformer(inputValueTransformer, this.reverseMapping),
      generateOutputValueTransformer(outputValueTransformer, this.mapping)
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    const transformedSchema = this.transformer.transformSchema(originalSchema);
    this.transformedSchema = mapSchema(transformedSchema, {
      [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _schema, externalValue) =>
        transformEnumValue(
          typeName,
          externalValue,
          valueConfig,
          this.enumValueTransformer,
          this.mapping,
          this.reverseMapping
        ),
    });
    return this.transformedSchema;
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: Record<string, any>,
    transformationContext: MapLeafValuesTransformationContext
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: Record<string, any>,
    transformationContext: MapLeafValuesTransformationContext
  ) {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}

function transformEnumValue(
  typeName: string,
  externalValue: string,
  enumValueConfig: GraphQLEnumValueConfig,
  enumValueTransformer: EnumValueTransformer,
  mapping: Record<string, Record<string, string>>,
  reverseMapping: Record<string, Record<string, string>>
): GraphQLEnumValueConfig | [string, GraphQLEnumValueConfig] {
  const transformedEnumValue = enumValueTransformer(typeName, externalValue, enumValueConfig);
  if (Array.isArray(transformedEnumValue)) {
    const newExternalValue = transformedEnumValue[0];

    if (newExternalValue !== externalValue) {
      if (!(typeName in mapping)) {
        mapping[typeName] = Object.create(null);
        reverseMapping[typeName] = Object.create(null);
      }
      mapping[typeName][externalValue] = newExternalValue;
      reverseMapping[typeName][newExternalValue] = externalValue;
    }
  }
  return transformedEnumValue;
}

function mapEnumValues(typeName: string, value: string, mapping: Record<string, Record<string, string>>): string {
  const newExternalValue = mapping[typeName]?.[value];
  return newExternalValue != null ? newExternalValue : value;
}

function generateInputValueTransformer(
  inputValueTransformer: LeafValueTransformer,
  reverseMapping: Record<string, Record<string, string>>
): LeafValueTransformer {
  if (inputValueTransformer == null) {
    return (typeName, value) => mapEnumValues(typeName, value, reverseMapping);
  } else {
    return (typeName, value) => mapEnumValues(typeName, inputValueTransformer(typeName, value), reverseMapping);
  }
}

function generateOutputValueTransformer(
  outputValueTransformer: LeafValueTransformer,
  mapping: Record<string, Record<string, string>>
): LeafValueTransformer {
  if (outputValueTransformer == null) {
    return (typeName, value) => mapEnumValues(typeName, value, mapping);
  } else {
    return (typeName, value) => outputValueTransformer(typeName, mapEnumValues(typeName, value, mapping));
  }
}
