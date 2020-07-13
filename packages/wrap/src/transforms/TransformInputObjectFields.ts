import {
  GraphQLSchema,
  GraphQLType,
  DocumentNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  Kind,
  FragmentDefinitionNode,
  GraphQLInputObjectType,
  ObjectValueNode,
  ObjectFieldNode,
  InputObjectTypeDefinitionNode,
  InputObjectTypeExtensionNode,
  GraphQLInputFieldConfig,
  InputValueDefinitionNode,
} from 'graphql';

import { Transform, Request, MapperKind, mapSchema } from '@graphql-tools/utils';
import { InputFieldTransformer, InputFieldNodeTransformer, InputObjectNodeTransformer } from '../types';
import { DelegationContext } from '@graphql-tools/delegate';

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

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    this.transformedSchema = mapSchema(originalSchema, {
      [MapperKind.INPUT_OBJECT_TYPE]: (type: GraphQLInputObjectType) =>
        this.transformFields(type, this.inputFieldTransformer),
    });

    return this.transformedSchema;
  }

  public transformRequest(originalRequest: Request, delegationContext?: Record<string, any>): Request {
    const fragments = Object.create(null);
    originalRequest.document.definitions
      .filter(def => def.kind === Kind.FRAGMENT_DEFINITION)
      .forEach(def => {
        fragments[(def as FragmentDefinitionNode).name.value] = def;
      });
    const document = this.transformDocument(
      originalRequest.document,
      this.mapping,
      this.inputFieldNodeTransformer,
      this.inputObjectNodeTransformer,
      originalRequest,
      // cast to DelegationContext as workaround to avoid breaking change in types until next major version
      delegationContext as DelegationContext
    );
    return {
      ...originalRequest,
      document,
    };
  }

  private transformFields(type: GraphQLInputObjectType, inputFieldTransformer: InputFieldTransformer): any {
    const config = type.toConfig();

    const originalInputFieldConfigMap = config.fields;
    const newInputFieldConfigMap = {};

    Object.keys(originalInputFieldConfigMap).forEach(fieldName => {
      const originalInputFieldConfig = originalInputFieldConfigMap[fieldName];
      const transformedField = inputFieldTransformer(type.name, fieldName, originalInputFieldConfig);

      if (transformedField === undefined) {
        newInputFieldConfigMap[fieldName] = originalInputFieldConfig;
      } else if (Array.isArray(transformedField)) {
        const newFieldName = transformedField[0];
        const newFieldConfig = transformedField[1];

        if (newFieldName !== fieldName) {
          const typeName = type.name;
          if (!(typeName in this.mapping)) {
            this.mapping[typeName] = {};
          }
          this.mapping[typeName][newFieldName] = fieldName;

          if (newFieldConfig.astNode != null) {
            newFieldConfig.astNode = {
              ...newFieldConfig.astNode,
              name: {
                ...newFieldConfig.astNode.name,
                value: newFieldName,
              },
            };
          }
        }

        newInputFieldConfigMap[newFieldName] = newFieldConfig;
      } else if (transformedField != null) {
        newInputFieldConfigMap[fieldName] = transformedField;
      }
    });

    if (!Object.keys(newInputFieldConfigMap).length) {
      return null;
    }

    const oldConfig = type.toConfig();
    return new GraphQLInputObjectType({
      ...oldConfig,
      fields: newInputFieldConfigMap,
      astNode: rebuildAstNode(oldConfig.astNode, oldConfig.extensionASTNodes, newInputFieldConfigMap),
      extensionASTNodes: [],
    });
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

function rebuildAstNode(
  astNode: InputObjectTypeDefinitionNode,
  extensionASTNodes: ReadonlyArray<InputObjectTypeExtensionNode>,
  fieldConfigMap: Record<string, GraphQLInputFieldConfig>
): InputObjectTypeDefinitionNode {
  if (astNode == null && !extensionASTNodes?.length) {
    return undefined;
  }

  let newAstNode: InputObjectTypeDefinitionNode = {
    ...astNode,
    fields: undefined,
  };

  if (extensionASTNodes != null) {
    extensionASTNodes.forEach(node => {
      newAstNode = {
        ...newAstNode,
        ...node,
        kind: newAstNode.kind,
        fields: undefined,
      };
    });
  }

  const fields: Array<InputValueDefinitionNode> = [];
  Object.values(fieldConfigMap).forEach(fieldConfig => {
    if (fieldConfig.astNode != null) {
      fields.push(fieldConfig.astNode);
    }
  });

  return {
    ...newAstNode,
    fields,
  };
}
