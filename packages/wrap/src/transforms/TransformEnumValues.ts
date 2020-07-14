import {
  GraphQLSchema,
  visit,
  Kind,
  TypeInfo,
  visitWithTypeInfo,
  GraphQLEnumType,
  GraphQLEnumValueConfig,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  VariableDefinitionNode,
  ArgumentNode,
  GraphQLArgument,
  FieldNode,
  EnumValueNode,
} from 'graphql';

import {
  Transform,
  Request,
  MapperKind,
  mapSchema,
  ExecutionResult,
  visitResult,
  ResultVisitorMap,
  updateArgument,
  transformInputValue,
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
    const document = originalRequest.document;
    const variableValues = originalRequest.variables;

    const operations: Array<OperationDefinitionNode> = document.definitions.filter(
      def => def.kind === Kind.OPERATION_DEFINITION
    ) as Array<OperationDefinitionNode>;
    const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
      def => def.kind === Kind.FRAGMENT_DEFINITION
    ) as Array<FragmentDefinitionNode>;

    const newOperations = operations.map((operation: OperationDefinitionNode) => {
      const variableDefinitionMap: Record<string, VariableDefinitionNode> = operation.variableDefinitions.reduce(
        (prev, def) => ({
          ...prev,
          [def.variable.name.value]: def,
        }),
        {}
      );
      const newOperation = visit(
        operation,
        visitWithTypeInfo(this.typeInfo, {
          [Kind.FIELD]: node =>
            transformFieldNode(node, this.typeInfo, variableDefinitionMap, variableValues, this.reverseMapping),
          [Kind.ENUM]: node => transformEnumValueNode(node, this.typeInfo, this.reverseMapping),
        })
      );
      return {
        ...newOperation,
        variableDefinitions: Object.keys(variableDefinitionMap).map(varName => variableDefinitionMap[varName]),
      };
    });

    const transformedRequest = {
      ...originalRequest,
      document: {
        ...document,
        definitions: [...newOperations, ...fragments],
      },
      variables: variableValues,
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

function transformFieldNode(
  field: FieldNode,
  typeInfo: TypeInfo,
  variableDefinitionMap: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>,
  reverseMapping: Record<string, Record<string, string>>
): FieldNode {
  const targetField = typeInfo.getFieldDef();

  if (!targetField.name.startsWith('__')) {
    const argumentNodes = field.arguments;
    if (argumentNodes != null) {
      const argumentNodeMap: Record<string, ArgumentNode> = argumentNodes.reduce(
        (prev, argument) => ({
          ...prev,
          [argument.name.value]: argument,
        }),
        Object.create(null)
      );

      targetField.args.forEach((argument: GraphQLArgument) => {
        const argName = argument.name;
        const argType = argument.type;

        if (argName in argumentNodeMap) {
          const argumentNode = argumentNodeMap[argName];
          const argValue = argumentNode.value;
          if (argValue.kind === Kind.VARIABLE) {
            updateArgument(
              argName,
              argType,
              argumentNodeMap,
              variableDefinitionMap,
              variableValues,
              transformInputValue(argType, variableValues[argValue.name.value], (t, v) => {
                const typeName = t.name;
                const newExternalValue = reverseMapping[typeName]?.[v];
                return newExternalValue != null ? newExternalValue : v;
              })
            );
          }
        }
      });

      return {
        ...field,
        arguments: Object.keys(argumentNodeMap).map(argName => argumentNodeMap[argName]),
      };
    }
  }
}

function transformEnumValueNode(
  enumValueNode: EnumValueNode,
  typeInfo: TypeInfo,
  reverseMapping: Record<string, Record<string, string>>
): EnumValueNode {
  const typeName = (typeInfo.getInputType() as GraphQLEnumType).name;
  const newExternalValue = reverseMapping[typeName]?.[enumValueNode.value];
  if (newExternalValue != null) {
    return {
      ...enumValueNode,
      value: newExternalValue,
    };
  }
}
