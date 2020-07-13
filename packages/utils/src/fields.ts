import {
  GraphQLFieldConfigMap,
  GraphQLObjectType,
  GraphQLFieldConfig,
  GraphQLSchema,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  FieldDefinitionNode,
} from 'graphql';
import { MapperKind } from './Interfaces';
import { mapSchema } from './mapSchema';
import { addTypes } from './addTypes';

export function appendObjectFields(
  schema: GraphQLSchema,
  typeName: string,
  additionalFields: GraphQLFieldConfigMap<any, any>
): GraphQLSchema {
  if (schema.getType(typeName) == null) {
    return addTypes(schema, [
      new GraphQLObjectType({
        name: typeName,
        fields: additionalFields,
      }),
    ]);
  }

  return mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === typeName) {
        const config = type.toConfig();
        const originalFieldConfigMap = config.fields;

        const newFieldConfigMap = {};
        Object.keys(originalFieldConfigMap).forEach(fieldName => {
          newFieldConfigMap[fieldName] = originalFieldConfigMap[fieldName];
        });
        Object.keys(additionalFields).forEach(fieldName => {
          newFieldConfigMap[fieldName] = additionalFields[fieldName];
        });

        return new GraphQLObjectType({
          ...config,
          fields: newFieldConfigMap,
          astNode: rebuildAstNode(config.astNode, config.extensionASTNodes, newFieldConfigMap),
          extensionASTNodes: [],
        });
      }
    },
  });
}

export function removeObjectFields(
  schema: GraphQLSchema,
  typeName: string,
  testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean
): [GraphQLSchema, GraphQLFieldConfigMap<any, any>] {
  const removedFields = {};
  const newSchema = mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === typeName) {
        const config = type.toConfig();
        const originalFieldConfigMap = config.fields;

        const newFieldConfigMap = {};
        Object.keys(originalFieldConfigMap).forEach(fieldName => {
          const originalFieldConfig = originalFieldConfigMap[fieldName];
          if (testFn(fieldName, originalFieldConfig)) {
            removedFields[fieldName] = originalFieldConfig;
          } else {
            newFieldConfigMap[fieldName] = originalFieldConfig;
          }
        });

        return new GraphQLObjectType({
          ...config,
          fields: newFieldConfigMap,
          astNode: rebuildAstNode(config.astNode, config.extensionASTNodes, newFieldConfigMap),
          extensionASTNodes: [],
        });
      }
    },
  });

  return [newSchema, removedFields];
}

export function selectObjectFields(
  schema: GraphQLSchema,
  typeName: string,
  testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean
): GraphQLFieldConfigMap<any, any> {
  const selectedFields = {};
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === typeName) {
        const config = type.toConfig();
        const originalFieldConfigMap = config.fields;

        Object.keys(originalFieldConfigMap).forEach(fieldName => {
          const originalFieldConfig = originalFieldConfigMap[fieldName];
          if (testFn(fieldName, originalFieldConfig)) {
            selectedFields[fieldName] = originalFieldConfig;
          }
        });
      }

      return undefined;
    },
  });

  return selectedFields;
}

export function modifyObjectFields(
  schema: GraphQLSchema,
  typeName: string,
  testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean,
  newFields: GraphQLFieldConfigMap<any, any>
): [GraphQLSchema, GraphQLFieldConfigMap<any, any>] {
  const removedFields = {};
  const newSchema = mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === typeName) {
        const config = type.toConfig();
        const originalFieldConfigMap = config.fields;

        const newFieldConfigMap = {};
        Object.keys(originalFieldConfigMap).forEach(fieldName => {
          const originalFieldConfig = originalFieldConfigMap[fieldName];
          if (testFn(fieldName, originalFieldConfig)) {
            removedFields[fieldName] = originalFieldConfig;
          } else {
            newFieldConfigMap[fieldName] = originalFieldConfig;
          }
        });

        Object.keys(newFields).forEach(fieldName => {
          const fieldConfig = newFields[fieldName];
          newFieldConfigMap[fieldName] = fieldConfig;
        });

        return new GraphQLObjectType({
          ...config,
          fields: newFieldConfigMap,
          astNode: rebuildAstNode(config.astNode, config.extensionASTNodes, newFieldConfigMap),
          extensionASTNodes: [],
        });
      }
    },
  });

  return [newSchema, removedFields];
}

function rebuildAstNode(
  astNode: ObjectTypeDefinitionNode,
  extensionASTNodes: ReadonlyArray<ObjectTypeExtensionNode>,
  fieldConfigMap: Record<string, GraphQLFieldConfig<any, any>>
): ObjectTypeDefinitionNode {
  if (astNode == null && !extensionASTNodes?.length) {
    return undefined;
  }

  let newAstNode: ObjectTypeDefinitionNode = {
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

  const fields: Array<FieldDefinitionNode> = [];
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
