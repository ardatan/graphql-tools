import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLNamedType,
  GraphQLScalarType,
  GraphQLUnionType,
  isEnumType,
  isInterfaceType,
  isInputObjectType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';

export function renameType(type: GraphQLObjectType, newTypeName: string): GraphQLObjectType;
export function renameType(type: GraphQLInterfaceType, newTypeName: string): GraphQLInterfaceType;
export function renameType(type: GraphQLUnionType, newTypeName: string): GraphQLUnionType;
export function renameType(type: GraphQLEnumType, newTypeName: string): GraphQLEnumType;
export function renameType(type: GraphQLScalarType, newTypeName: string): GraphQLScalarType;
export function renameType(type: GraphQLInputObjectType, newTypeName: string): GraphQLInputObjectType;
export function renameType(type: GraphQLNamedType, newTypeName: string): GraphQLNamedType;
export function renameType(type: any, newTypeName: string): GraphQLNamedType {
  if (isObjectType(type)) {
    return new GraphQLObjectType({
      ...type.toConfig(),
      name: newTypeName,
      astNode:
        type.astNode == null
          ? type.astNode
          : {
              ...type.astNode,
              name: {
                ...type.astNode.name,
                value: newTypeName,
              },
            },
      extensionASTNodes:
        type.extensionASTNodes == null
          ? type.extensionASTNodes
          : type.extensionASTNodes.map(node => ({
              ...node,
              name: {
                ...node.name,
                value: newTypeName,
              },
            })),
    });
  } else if (isInterfaceType(type)) {
    return new GraphQLInterfaceType({
      ...type.toConfig(),
      name: newTypeName,
      astNode:
        type.astNode == null
          ? type.astNode
          : {
              ...type.astNode,
              name: {
                ...type.astNode.name,
                value: newTypeName,
              },
            },
      extensionASTNodes:
        type.extensionASTNodes == null
          ? type.extensionASTNodes
          : type.extensionASTNodes.map(node => ({
              ...node,
              name: {
                ...node.name,
                value: newTypeName,
              },
            })),
    });
  } else if (isUnionType(type)) {
    return new GraphQLUnionType({
      ...type.toConfig(),
      name: newTypeName,
      astNode:
        type.astNode == null
          ? type.astNode
          : {
              ...type.astNode,
              name: {
                ...type.astNode.name,
                value: newTypeName,
              },
            },
      extensionASTNodes:
        type.extensionASTNodes == null
          ? type.extensionASTNodes
          : type.extensionASTNodes.map(node => ({
              ...node,
              name: {
                ...node.name,
                value: newTypeName,
              },
            })),
    });
  } else if (isInputObjectType(type)) {
    return new GraphQLInputObjectType({
      ...type.toConfig(),
      name: newTypeName,
      astNode:
        type.astNode == null
          ? type.astNode
          : {
              ...type.astNode,
              name: {
                ...type.astNode.name,
                value: newTypeName,
              },
            },
      extensionASTNodes:
        type.extensionASTNodes == null
          ? type.extensionASTNodes
          : type.extensionASTNodes.map(node => ({
              ...node,
              name: {
                ...node.name,
                value: newTypeName,
              },
            })),
    });
  } else if (isEnumType(type)) {
    return new GraphQLEnumType({
      ...type.toConfig(),
      name: newTypeName,
      astNode:
        type.astNode == null
          ? type.astNode
          : {
              ...type.astNode,
              name: {
                ...type.astNode.name,
                value: newTypeName,
              },
            },
      extensionASTNodes:
        type.extensionASTNodes == null
          ? type.extensionASTNodes
          : type.extensionASTNodes.map(node => ({
              ...node,
              name: {
                ...node.name,
                value: newTypeName,
              },
            })),
    });
  } else if (isScalarType(type)) {
    return new GraphQLScalarType({
      ...type.toConfig(),
      name: newTypeName,
      astNode:
        type.astNode == null
          ? type.astNode
          : {
              ...type.astNode,
              name: {
                ...type.astNode.name,
                value: newTypeName,
              },
            },
      extensionASTNodes:
        type.extensionASTNodes == null
          ? type.extensionASTNodes
          : type.extensionASTNodes.map(node => ({
              ...node,
              name: {
                ...node.name,
                value: newTypeName,
              },
            })),
    });
  }

  throw new Error(`Unknown type ${type as string}.`);
}
