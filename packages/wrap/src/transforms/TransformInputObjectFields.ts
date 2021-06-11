import {
  GraphQLSchema,
  GraphQLType,
  DocumentNode,
  typeFromAST,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  Kind,
  GraphQLInputObjectType,
  GraphQLInputType,
  ObjectValueNode,
  ObjectFieldNode,
  OperationDefinitionNode,
  NamedTypeNode,
} from 'graphql';

import { Request, MapperKind, mapSchema, transformInputValue } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { InputFieldTransformer, InputFieldNodeTransformer, InputObjectNodeTransformer } from '../types';

export default class TransformInputObjectFields implements Transform {
  private readonly inputFieldTransformer: InputFieldTransformer;
  private readonly inputFieldNodeTransformer: InputFieldNodeTransformer;
  private readonly inputObjectNodeTransformer: InputObjectNodeTransformer;
  private transformedSchema: GraphQLSchema;
  private mapping: Record<string, Record<string, string>>;

  constructor(
    inputFieldTransformer: InputFieldTransformer,
    inputFieldNodeTransformer?: InputFieldNodeTransformer,
    inputObjectNodeTransformer?: InputObjectNodeTransformer
  ) {
    this.inputFieldTransformer = inputFieldTransformer;
    this.inputFieldNodeTransformer = inputFieldNodeTransformer;
    this.inputObjectNodeTransformer = inputObjectNodeTransformer;
    this.mapping = {};
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    this.transformedSchema = mapSchema(originalWrappingSchema, {
      [MapperKind.INPUT_OBJECT_FIELD]: (inputFieldConfig, fieldName, typeName) => {
        const transformedInputField = this.inputFieldTransformer(typeName, fieldName, inputFieldConfig);
        if (Array.isArray(transformedInputField)) {
          const newFieldName = transformedInputField[0];

          if (newFieldName !== fieldName) {
            if (!(typeName in this.mapping)) {
              this.mapping[typeName] = {};
            }
            this.mapping[typeName][newFieldName] = fieldName;
          }
        }
        return transformedInputField;
      },
    });

    return this.transformedSchema;
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const variableValues = originalRequest.variables;

    const operations: Array<OperationDefinitionNode> = [];

    originalRequest.document.definitions.forEach(def => {
      if ((def as OperationDefinitionNode).kind === Kind.OPERATION_DEFINITION) {
        operations.push(def as OperationDefinitionNode);
      }
    });

    operations.forEach(def => {
      const variableDefs = def.variableDefinitions;
      if (variableDefs != null) {
        variableDefs.forEach(variableDef => {
          const varName = variableDef.variable.name.value;
          // requirement for 'as NamedTypeNode' appears to be a bug within types, as function should take any TypeNode
          const varType = typeFromAST(
            delegationContext.transformedSchema,
            variableDef.type as NamedTypeNode
          ) as GraphQLInputType;
          variableValues[varName] = transformInputValue(
            varType,
            variableValues[varName],
            undefined,
            (type, originalValue) => {
              const newValue = Object.create(null);
              const fields = type.getFields();
              Object.keys(originalValue).forEach(key => {
                const field = fields[key];
                if (field != null) {
                  const newFieldName = this.mapping[type.name]?.[field.name];
                  if (newFieldName != null) {
                    newValue[newFieldName] = originalValue[field.name];
                  } else {
                    newValue[field.name] = originalValue[field.name];
                  }
                }
              });
              return newValue;
            }
          );
        });
      }
    });

    const document = this.transformDocument(
      originalRequest.document,
      this.mapping,
      this.inputFieldNodeTransformer,
      this.inputObjectNodeTransformer,
      originalRequest,
      delegationContext
    );
    return {
      ...originalRequest,
      document,
      variables: variableValues,
    };
  }

  private transformDocument(
    document: DocumentNode,
    mapping: Record<string, Record<string, string>>,
    inputFieldNodeTransformer: InputFieldNodeTransformer,
    inputObjectNodeTransformer: InputObjectNodeTransformer,
    request: Request,
    delegationContext?: DelegationContext
  ): DocumentNode {
    const typeInfo = new TypeInfo(this.transformedSchema);
    const newDocument: DocumentNode = visit(
      document,
      visitWithTypeInfo(typeInfo, {
        leave: {
          [Kind.OBJECT]: (node: ObjectValueNode): ObjectValueNode => {
            const parentType: GraphQLType = typeInfo.getInputType() as GraphQLInputObjectType;
            if (parentType != null) {
              const parentTypeName = parentType.name;
              const newInputFields: Array<ObjectFieldNode> = [];

              node.fields.forEach(inputField => {
                const newName = inputField.name.value;

                const transformedInputField =
                  inputFieldNodeTransformer != null
                    ? inputFieldNodeTransformer(parentTypeName, newName, inputField, request, delegationContext)
                    : inputField;

                if (Array.isArray(transformedInputField)) {
                  transformedInputField.forEach(individualTransformedInputField => {
                    const typeMapping = mapping[parentTypeName];
                    if (typeMapping == null) {
                      newInputFields.push(individualTransformedInputField);
                      return;
                    }

                    const oldName = typeMapping[newName];
                    if (oldName == null) {
                      newInputFields.push(individualTransformedInputField);
                      return;
                    }

                    newInputFields.push({
                      ...individualTransformedInputField,
                      name: {
                        ...individualTransformedInputField.name,
                        value: oldName,
                      },
                    });
                  });
                  return;
                }

                const typeMapping = mapping[parentTypeName];
                if (typeMapping == null) {
                  newInputFields.push(transformedInputField);
                  return;
                }

                const oldName = typeMapping[newName];
                if (oldName == null) {
                  newInputFields.push(transformedInputField);
                  return;
                }

                newInputFields.push({
                  ...transformedInputField,
                  name: {
                    ...transformedInputField.name,
                    value: oldName,
                  },
                });
              });

              const newNode = {
                ...node,
                fields: newInputFields,
              };

              return inputObjectNodeTransformer != null
                ? inputObjectNodeTransformer(parentTypeName, newNode, request, delegationContext)
                : newNode;
            }
          },
        },
      })
    );
    return newDocument;
  }
}
