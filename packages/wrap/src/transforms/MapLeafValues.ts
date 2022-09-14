import {
  GraphQLSchema,
  visit,
  Kind,
  TypeInfo,
  visitWithTypeInfo,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  ArgumentNode,
  FieldNode,
  valueFromAST,
  isLeafType,
  astFromValue,
  valueFromASTUntyped,
} from 'graphql';

import {
  ExecutionRequest,
  ExecutionResult,
  visitResult,
  ResultVisitorMap,
  transformInputValue,
} from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { LeafValueTransformer } from '../types.js';

export interface MapLeafValuesTransformationContext {
  transformedRequest: ExecutionRequest;
}

export default class MapLeafValues<TContext = Record<string, any>>
  implements Transform<MapLeafValuesTransformationContext, TContext>
{
  private readonly inputValueTransformer: LeafValueTransformer;
  private readonly outputValueTransformer: LeafValueTransformer;
  private readonly resultVisitorMap: ResultVisitorMap;
  private originalWrappingSchema: GraphQLSchema | undefined;
  private typeInfo: TypeInfo | undefined;

  constructor(inputValueTransformer: LeafValueTransformer, outputValueTransformer: LeafValueTransformer) {
    this.inputValueTransformer = inputValueTransformer;
    this.outputValueTransformer = outputValueTransformer;
    this.resultVisitorMap = Object.create(null);
  }

  private _getTypeInfo() {
    const typeInfo = this.typeInfo;
    if (typeInfo === undefined) {
      throw new Error(
        `The MapLeafValues transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`
      );
    }
    return typeInfo;
  }

  private _getOriginalWrappingSchema() {
    const originalWrappingSchema = this.originalWrappingSchema;
    if (originalWrappingSchema === undefined) {
      throw new Error(
        `The MapLeafValues transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`
      );
    }
    return originalWrappingSchema;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    this.originalWrappingSchema = originalWrappingSchema;
    const typeMap = originalWrappingSchema.getTypeMap();
    for (const typeName in typeMap) {
      const type = typeMap[typeName];
      if (!typeName.startsWith('__')) {
        if (isLeafType(type)) {
          this.resultVisitorMap[typeName] = (value: any) => this.outputValueTransformer(typeName, value);
        }
      }
    }
    this.typeInfo = new TypeInfo(originalWrappingSchema);
    return originalWrappingSchema;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    transformationContext: MapLeafValuesTransformationContext
  ): ExecutionRequest {
    const document = originalRequest.document;
    const variableValues = originalRequest.variables ?? {};

    const operations: Array<OperationDefinitionNode> = document.definitions.filter(
      def => def.kind === Kind.OPERATION_DEFINITION
    ) as Array<OperationDefinitionNode>;
    const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
      def => def.kind === Kind.FRAGMENT_DEFINITION
    ) as Array<FragmentDefinitionNode>;

    const newOperations = this.transformOperations(operations, variableValues);

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
    _delegationContext: DelegationContext<TContext>,
    transformationContext: MapLeafValuesTransformationContext
  ): ExecutionResult {
    return visitResult(
      originalResult,
      transformationContext.transformedRequest,
      this._getOriginalWrappingSchema(),
      this.resultVisitorMap
    );
  }

  private transformOperations(
    operations: Array<OperationDefinitionNode>,
    variableValues: Record<string, any>
  ): Array<OperationDefinitionNode> {
    return operations.map((operation: OperationDefinitionNode) => {
      return visit(
        operation,
        visitWithTypeInfo(this._getTypeInfo(), {
          [Kind.FIELD]: node => this.transformFieldNode(node, variableValues),
        })
      );
    });
  }

  private transformFieldNode(field: FieldNode, variableValues: Record<string, any>): FieldNode | undefined {
    const targetField = this._getTypeInfo().getFieldDef();

    if (!targetField) {
      return;
    }

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

        for (const argument of targetField.args) {
          const argName = argument.name;
          const argType = argument.type;

          const argumentNode = argumentNodeMap[argName];
          const argValue = argumentNode?.value;

          let value: any;
          if (argValue != null) {
            value = valueFromAST(argValue, argType, variableValues);
            if (value == null) {
              value = valueFromASTUntyped(argValue, variableValues);
            }
          }

          const transformedValue = transformInputValue(argType, value, (t, v) => {
            const newValue = this.inputValueTransformer(t.name, v);
            return newValue === undefined ? v : newValue;
          });

          if (argValue.kind === Kind.VARIABLE) {
            variableValues[argValue.name.value] = transformedValue;
          } else {
            const newValueNode = astFromValue(transformedValue, argType);
            argumentNodeMap[argName] = {
              ...argumentNode,
              value: newValueNode!,
            };
          }
        }

        return {
          ...field,
          arguments: Object.values(argumentNodeMap),
        };
      }
    }
  }
}
