import {
  GraphQLSchema,
  visit,
  Kind,
  TypeInfo,
  visitWithTypeInfo,
  GraphQLEnumType,
  GraphQLEnumValueConfig,
} from 'graphql';

import {
  Transform,
  Request,
  MapperKind,
  mapSchema,
  ExecutionResult,
  visitResult,
  ResultVisitorMap,
} from '@graphql-tools/utils';
import { EnumValueTransformer } from '../types';

interface TransformEnumValuesTransformationContext {
  transformedRequest: Request;
}

export default class TransformEnumValues implements Transform {
  private readonly enumValueTransformer: EnumValueTransformer;
  private originalSchema: GraphQLSchema;
  private transformedSchema: GraphQLSchema;
  private typeInfo: TypeInfo;
  private mapping: Record<string, Record<string, string>>;
  private reverseMapping: Record<string, Record<string, string>>;
  private resultVisitorMap: ResultVisitorMap;

  constructor(enumValueTransformer: EnumValueTransformer) {
    this.enumValueTransformer = enumValueTransformer;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    this.originalSchema = originalSchema;
    this.mapping = Object.create(null);
    this.reverseMapping = Object.create(null);
    this.resultVisitorMap = Object.create(null);
    this.transformedSchema = mapSchema(originalSchema, {
      [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _schema, externalValue) =>
        transformEnumValue(
          typeName,
          externalValue,
          valueConfig,
          this.enumValueTransformer,
          this.mapping,
          this.reverseMapping,
          this.resultVisitorMap
        ),
    });
    this.typeInfo = new TypeInfo(this.transformedSchema);
    return this.transformedSchema;
  }

  public transformRequest(
    originalRequest: Request,
    _delegationContext: Record<string, any>,
    transformationContext: TransformEnumValuesTransformationContext
  ): Request {
    const document = visit(
      originalRequest.document,
      visitWithTypeInfo(this.typeInfo, {
        [Kind.ENUM]: node => {
          const typeName = (this.typeInfo.getInputType() as GraphQLEnumType).name;
          const newExternalValue = this.reverseMapping[typeName]?.[node.value];
          if (newExternalValue != null) {
            return {
              ...node,
              value: newExternalValue,
            };
          }
        },
      })
    );

    const transformedRequest = {
      ...originalRequest,
      document,
    };

    transformationContext.transformedRequest = transformedRequest;

    return transformedRequest;
  }

  public transformResult(
    originalResult: ExecutionResult,
    _delegationContext: Record<string, any>,
    transformationContext: TransformEnumValuesTransformationContext
  ) {
    return visitResult(
      originalResult,
      transformationContext.transformedRequest,
      this.originalSchema,
      this.resultVisitorMap
    );
  }
}

function transformEnumValue(
  typeName: string,
  externalValue: string,
  enumValueConfig: GraphQLEnumValueConfig,
  enumValueTransformer: EnumValueTransformer,
  mapping: Record<string, Record<string, string>>,
  reverseMapping: Record<string, Record<string, string>>,
  resultVisitorMap: ResultVisitorMap
): GraphQLEnumValueConfig | [string, GraphQLEnumValueConfig] {
  const transformedEnumValue = enumValueTransformer(typeName, externalValue, enumValueConfig);
  if (Array.isArray(transformedEnumValue)) {
    const newExternalValue = transformedEnumValue[0];

    if (newExternalValue !== externalValue) {
      if (!(typeName in mapping)) {
        mapping[typeName] = Object.create(null);
        reverseMapping[typeName] = Object.create(null);
        resultVisitorMap[typeName] = (externalValue: string) => {
          const newExternalValue = mapping[typeName][externalValue];
          return newExternalValue == null ? externalValue : newExternalValue;
        };
      }
      mapping[typeName][externalValue] = newExternalValue;
      reverseMapping[typeName][newExternalValue] = externalValue;
    }
  }
  return transformedEnumValue;
}
