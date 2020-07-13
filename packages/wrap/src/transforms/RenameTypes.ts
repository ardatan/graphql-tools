import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLScalarType,
  GraphQLUnionType,
  Kind,
  NamedTypeNode,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
  visit,
} from 'graphql';

import {
  Transform,
  Request,
  ExecutionResult,
  MapperKind,
  RenameTypesOptions,
  mapSchema,
  visitData,
} from '@graphql-tools/utils';

export default class RenameTypes implements Transform {
  private readonly renamer: (name: string) => string | undefined;
  private map: Record<string, string>;
  private reverseMap: Record<string, string>;
  private readonly renameBuiltins: boolean;
  private readonly renameScalars: boolean;

  constructor(renamer: (name: string) => string | undefined, options?: RenameTypesOptions) {
    this.renamer = renamer;
    this.map = Object.create(null);
    this.reverseMap = Object.create(null);
    const { renameBuiltins = false, renameScalars = true } = options != null ? options : {};
    this.renameBuiltins = renameBuiltins;
    this.renameScalars = renameScalars;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return mapSchema(originalSchema, {
      [MapperKind.TYPE]: (type: GraphQLNamedType) => {
        if (isSpecifiedScalarType(type) && !this.renameBuiltins) {
          return undefined;
        }
        if (isScalarType(type) && !this.renameScalars) {
          return undefined;
        }
        const oldName = type.name;
        const newName = this.renamer(oldName);
        if (newName !== undefined && newName !== oldName) {
          this.map[oldName] = newName;
          this.reverseMap[newName] = oldName;

          if (isObjectType(type)) {
            return new GraphQLObjectType({
              ...type.toConfig(),
              name: newName,
              astNode:
                type.astNode == null
                  ? type.astNode
                  : {
                      ...type.astNode,
                      name: {
                        ...type.astNode.name,
                        value: newName,
                      },
                    },
              extensionASTNodes:
                type.extensionASTNodes == null
                  ? type.extensionASTNodes
                  : type.extensionASTNodes.map(node => ({
                      ...node,
                      name: {
                        ...node.name,
                        value: newName,
                      },
                    })),
            });
          } else if (isInterfaceType(type)) {
            return new GraphQLInterfaceType({
              ...type.toConfig(),
              name: newName,
              astNode:
                type.astNode == null
                  ? type.astNode
                  : {
                      ...type.astNode,
                      name: {
                        ...type.astNode.name,
                        value: newName,
                      },
                    },
              extensionASTNodes:
                type.extensionASTNodes == null
                  ? type.extensionASTNodes
                  : type.extensionASTNodes.map(node => ({
                      ...node,
                      name: {
                        ...node.name,
                        value: newName,
                      },
                    })),
            });
          } else if (isUnionType(type)) {
            return new GraphQLUnionType({
              ...type.toConfig(),
              name: newName,
              astNode:
                type.astNode == null
                  ? type.astNode
                  : {
                      ...type.astNode,
                      name: {
                        ...type.astNode.name,
                        value: newName,
                      },
                    },
              extensionASTNodes:
                type.extensionASTNodes == null
                  ? type.extensionASTNodes
                  : type.extensionASTNodes.map(node => ({
                      ...node,
                      name: {
                        ...node.name,
                        value: newName,
                      },
                    })),
            });
          } else if (isInputObjectType(type)) {
            return new GraphQLInputObjectType({
              ...type.toConfig(),
              name: newName,
              astNode:
                type.astNode == null
                  ? type.astNode
                  : {
                      ...type.astNode,
                      name: {
                        ...type.astNode.name,
                        value: newName,
                      },
                    },
              extensionASTNodes:
                type.extensionASTNodes == null
                  ? type.extensionASTNodes
                  : type.extensionASTNodes.map(node => ({
                      ...node,
                      name: {
                        ...node.name,
                        value: newName,
                      },
                    })),
            });
          } else if (isEnumType(type)) {
            return new GraphQLEnumType({
              ...type.toConfig(),
              name: newName,
              astNode:
                type.astNode == null
                  ? type.astNode
                  : {
                      ...type.astNode,
                      name: {
                        ...type.astNode.name,
                        value: newName,
                      },
                    },
              extensionASTNodes:
                type.extensionASTNodes == null
                  ? type.extensionASTNodes
                  : type.extensionASTNodes.map(node => ({
                      ...node,
                      name: {
                        ...node.name,
                        value: newName,
                      },
                    })),
            });
          } else if (isScalarType(type)) {
            return new GraphQLScalarType({
              ...type.toConfig(),
              name: newName,
              astNode:
                type.astNode == null
                  ? type.astNode
                  : {
                      ...type.astNode,
                      name: {
                        ...type.astNode.name,
                        value: newName,
                      },
                    },
              extensionASTNodes:
                type.extensionASTNodes == null
                  ? type.extensionASTNodes
                  : type.extensionASTNodes.map(node => ({
                      ...node,
                      name: {
                        ...node.name,
                        value: newName,
                      },
                    })),
            });
          }

          throw new Error(`Unknown type ${type as string}.`);
        }
      },

      [MapperKind.ROOT_OBJECT]() {
        return undefined;
      },
    });
  }

  public transformRequest(originalRequest: Request): Request {
    const document = visit(originalRequest.document, {
      [Kind.NAMED_TYPE]: (node: NamedTypeNode) => {
        const name = node.name.value;
        if (name in this.reverseMap) {
          return {
            ...node,
            name: {
              kind: Kind.NAME,
              value: this.reverseMap[name],
            },
          };
        }
      },
    });

    return {
      ...originalRequest,
      document,
    };
  }

  public transformResult(result: ExecutionResult): ExecutionResult {
    return {
      ...result,
      data: visitData(result.data, object => {
        const typeName = object?.__typename;
        if (typeName != null && typeName in this.map) {
          object.__typename = this.map[typeName];
        }
        return object;
      }),
    };
  }
}
