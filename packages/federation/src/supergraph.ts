import {
  buildASTSchema,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  OperationTypeNode,
  parse,
  ScalarTypeDefinitionNode,
  TypeDefinitionNode,
  UnionTypeDefinitionNode,
  visit,
} from 'graphql';
import { MergedTypeConfig, SubschemaConfig } from '@graphql-tools/delegate';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { stitchSchemas } from '@graphql-tools/stitch';
import { type Executor } from '@graphql-tools/utils';
import {
  filterInternalFieldsAndTypes,
  getArgsFromKeysForFederation,
  getCacheKeyFnFromKey,
  getKeyFnForFederation,
  getNamedTypeNode,
} from './utils.js';

export interface GetSubschemasFromSupergraphSdlOpts {
  supergraphSdl: string | DocumentNode;
  onExecutor?: (opts: { subgraphName: string; endpoint: string }) => Executor;
  batch?: boolean;
}

export function getSubschemasFromSupergraphSdl({
  supergraphSdl,
  onExecutor = ({ endpoint }) => buildHTTPExecutor({ endpoint }),
  batch = false,
}: GetSubschemasFromSupergraphSdlOpts) {
  const ast =
    typeof supergraphSdl === 'string' ? parse(supergraphSdl, { noLocation: true }) : supergraphSdl;
  const subgraphRootFieldDefinitionNodes = new Map<
    string,
    Map<OperationTypeNode, FieldDefinitionNode[]>
  >();
  const subgraphEndpointMap = new Map<string, string>();
  const subgraphTypesMap = new Map<string, TypeDefinitionNode[]>();
  const typeNameKeysBySubgraphMap = new Map<string, Map<string, string[]>>();
  const typeNameFieldsKeyBySubgraphMap = new Map<string, Map<string, Map<string, string>>>();
  const typeNameCanonicalMap = new Map<string, string>();
  const rootTypeNames = new Map<OperationTypeNode, string>();
  const subgraphTypeNameExtraFieldsMap = new Map<string, Map<string, FieldDefinitionNode[]>>();
  function TypeWithFieldsVisitor(typeNode: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) {
    if ([...rootTypeNames.values()].includes(typeNode.name.value)) {
      const operationTypeName = [...rootTypeNames.entries()].find(
        ([, rootTypeName]) => rootTypeName === typeNode.name.value,
      )![0];
      typeNode.fields?.forEach(fieldNode => {
        fieldNode.directives?.forEach(directiveNode => {
          if (directiveNode.name.value === 'join__field') {
            directiveNode.arguments?.forEach(argumentNode => {
              if (argumentNode.name.value === 'graph' && argumentNode.value?.kind === Kind.ENUM) {
                const graphName = argumentNode.value.value;
                let subgraphRootFieldDefinitionNodeMap =
                  subgraphRootFieldDefinitionNodes.get(graphName);
                if (!subgraphRootFieldDefinitionNodeMap) {
                  subgraphRootFieldDefinitionNodeMap = new Map();
                  subgraphRootFieldDefinitionNodes.set(
                    graphName,
                    subgraphRootFieldDefinitionNodeMap,
                  );
                }
                let fieldDefinitionNodesOfSubgraph =
                  subgraphRootFieldDefinitionNodeMap.get(operationTypeName);
                if (!fieldDefinitionNodesOfSubgraph) {
                  fieldDefinitionNodesOfSubgraph = [];
                  subgraphRootFieldDefinitionNodeMap.set(
                    operationTypeName,
                    fieldDefinitionNodesOfSubgraph,
                  );
                }
                fieldDefinitionNodesOfSubgraph.push({
                  ...fieldNode,
                  directives: fieldNode.directives?.filter(
                    directiveNode => directiveNode.name.value !== 'join__field',
                  ),
                });
              }
            });
          }
        });
      });
    }
    const fieldDefinitionNodesByGraphName = new Map<string, FieldDefinitionNode[]>();
    typeNode.directives?.forEach(directiveNode => {
      if (typeNode.kind === Kind.OBJECT_TYPE_DEFINITION) {
        if (directiveNode.name.value === 'join__owner') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode.value?.kind === Kind.ENUM) {
              typeNameCanonicalMap.set(typeNode.name.value, argumentNode.value.value);
            }
          });
        }
      }
      if (directiveNode.name.value === 'join__type') {
        const joinTypeGraphArgNode = directiveNode.arguments?.find(
          argumentNode => argumentNode.name.value === 'graph',
        );
        if (joinTypeGraphArgNode?.value?.kind === Kind.ENUM) {
          const graphName = joinTypeGraphArgNode.value.value;
          if (typeNode.kind === Kind.OBJECT_TYPE_DEFINITION) {
            const keyArgumentNode = directiveNode.arguments?.find(
              argumentNode => argumentNode.name.value === 'key',
            );
            if (keyArgumentNode?.value?.kind === Kind.STRING) {
              let typeNameKeysMap = typeNameKeysBySubgraphMap.get(graphName);
              if (!typeNameKeysMap) {
                typeNameKeysMap = new Map();
                typeNameKeysBySubgraphMap.set(graphName, typeNameKeysMap);
              }
              let keys = typeNameKeysMap.get(typeNode.name.value);
              if (!keys) {
                keys = [];
                typeNameKeysMap.set(typeNode.name.value, keys);
              }
              keys.push(keyArgumentNode.value.value);
            }
          }
          const fieldDefinitionNodesOfSubgraph: FieldDefinitionNode[] = [];
          typeNode.fields?.forEach(fieldNode => {
            const joinFieldDirectives = fieldNode.directives?.filter(
              directiveNode => directiveNode.name.value === 'join__field',
            );
            joinFieldDirectives?.forEach(joinFieldDirectiveNode => {
              const joinFieldGraphArgNode = joinFieldDirectiveNode.arguments?.find(
                argumentNode => argumentNode.name.value === 'graph',
              );
              if (
                joinFieldGraphArgNode?.value?.kind === Kind.ENUM &&
                joinFieldGraphArgNode.value.value === graphName
              ) {
                const isExternal = joinFieldDirectiveNode.arguments?.some(
                  argumentNode =>
                    argumentNode.name.value === 'external' &&
                    argumentNode.value?.kind === Kind.BOOLEAN &&
                    argumentNode.value.value === true,
                );
                if (!isExternal) {
                  fieldDefinitionNodesOfSubgraph.push({
                    ...fieldNode,
                    directives: fieldNode.directives?.filter(
                      directiveNode => directiveNode.name.value !== 'join__field',
                    ),
                  });
                }

                const providedExtraField = joinFieldDirectiveNode.arguments?.find(
                  argumentNode => argumentNode.name.value === 'provides',
                );
                if (providedExtraField?.value?.kind === Kind.STRING) {
                  let typeNameExtraFieldsMap = subgraphTypeNameExtraFieldsMap.get(graphName);
                  if (!typeNameExtraFieldsMap) {
                    typeNameExtraFieldsMap = new Map();
                    subgraphTypeNameExtraFieldsMap.set(graphName, typeNameExtraFieldsMap);
                  }
                  const fieldNodeType = getNamedTypeNode(fieldNode.type);
                  let extraFields = typeNameExtraFieldsMap.get(fieldNodeType.name.value);
                  if (!extraFields) {
                    extraFields = [];
                    typeNameExtraFieldsMap.set(fieldNodeType.name.value, extraFields);
                  }
                  const extraFieldTypeNode = ast.definitions.find(
                    def => 'name' in def && def.name?.value === fieldNodeType.name.value,
                  ) as ObjectTypeDefinitionNode;
                  providedExtraField.value.value.split(' ').forEach(extraField => {
                    const extraFieldNodeInType = extraFieldTypeNode.fields?.find(
                      fieldNode => fieldNode.name.value === extraField,
                    );
                    if (extraFieldNodeInType) {
                      extraFields!.push({
                        ...extraFieldNodeInType,
                        directives: extraFieldNodeInType.directives?.filter(
                          directiveNode => directiveNode.name.value !== 'join__field',
                        ),
                      });
                    }
                  });
                }

                const requiresArgumentNode = joinFieldDirectiveNode.arguments?.find(
                  argumentNode => argumentNode.name.value === 'requires',
                );
                if (requiresArgumentNode?.value?.kind === Kind.STRING) {
                  let typeNameFieldsKeyMap = typeNameFieldsKeyBySubgraphMap.get(graphName);
                  if (!typeNameFieldsKeyMap) {
                    typeNameFieldsKeyMap = new Map();
                    typeNameFieldsKeyBySubgraphMap.set(graphName, typeNameFieldsKeyMap);
                  }
                  let fieldsKeyMap = typeNameFieldsKeyMap.get(typeNode.name.value);
                  if (!fieldsKeyMap) {
                    fieldsKeyMap = new Map();
                    typeNameFieldsKeyMap.set(typeNode.name.value, fieldsKeyMap);
                  }
                  fieldsKeyMap.set(fieldNode.name.value, requiresArgumentNode.value.value);
                }
              }
            });
            // Add if no join__field directive
            if (!joinFieldDirectives?.length) {
              fieldDefinitionNodesOfSubgraph.push({
                ...fieldNode,
                directives: fieldNode.directives?.filter(
                  directiveNode => directiveNode.name.value !== 'join__field',
                ),
              });
            }
          });
          fieldDefinitionNodesByGraphName.set(graphName, fieldDefinitionNodesOfSubgraph);
        }
      }
    });
    const joinImplementsDirectives = typeNode.directives?.filter(
      directiveNode => directiveNode.name.value === 'join__implements',
    );
    fieldDefinitionNodesByGraphName.forEach((fieldDefinitionNodesOfSubgraph, graphName) => {
      const interfaces: NamedTypeNode[] = [];
      typeNode.interfaces?.forEach(interfaceNode => {
        const implementedSubgraphs = joinImplementsDirectives?.filter(directiveNode => {
          const argumentNode = directiveNode.arguments?.find(
            argumentNode => argumentNode.name.value === 'interface',
          );
          return (
            argumentNode?.value?.kind === Kind.STRING &&
            argumentNode.value.value === interfaceNode.name.value
          );
        });
        if (
          !implementedSubgraphs?.length ||
          implementedSubgraphs.some(directiveNode => {
            const argumentNode = directiveNode.arguments?.find(
              argumentNode => argumentNode.name.value === 'graph',
            );
            return (
              argumentNode?.value?.kind === Kind.ENUM && argumentNode.value.value === graphName
            );
          })
        ) {
          interfaces.push(interfaceNode);
        }
      });
      const objectTypedDefNodeForSubgraph: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode =
        {
          ...typeNode,
          interfaces,
          fields: fieldDefinitionNodesOfSubgraph,
          directives: typeNode.directives?.filter(
            directiveNode =>
              directiveNode.name.value !== 'join__type' &&
              directiveNode.name.value !== 'join__owner' &&
              directiveNode.name.value !== 'join__implements',
          ),
        };
      let subgraphTypes = subgraphTypesMap.get(graphName);
      if (!subgraphTypes) {
        subgraphTypes = [];
        subgraphTypesMap.set(graphName, subgraphTypes);
      }
      subgraphTypes.push(objectTypedDefNodeForSubgraph);
    });
  }
  visit(ast, {
    SchemaDefinition(node) {
      node.operationTypes?.forEach(operationTypeNode => {
        rootTypeNames.set(operationTypeNode.operation, operationTypeNode.type.name.value);
      });
    },
    ScalarTypeDefinition(node) {
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              const graphName = argumentNode.value.value;
              let subgraphTypes = subgraphTypesMap.get(graphName);
              if (!subgraphTypes) {
                subgraphTypes = [];
                subgraphTypesMap.set(graphName, subgraphTypes);
              }
              subgraphTypes.push({
                ...node,
                directives: node.directives?.filter(
                  directiveNode => directiveNode.name.value !== 'join__type',
                ),
              });
            }
          });
        }
      });
    },
    InputObjectTypeDefinition(node) {
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              const graphName = argumentNode.value.value;
              let subgraphTypes = subgraphTypesMap.get(graphName);
              if (!subgraphTypes) {
                subgraphTypes = [];
                subgraphTypesMap.set(graphName, subgraphTypes);
              }
              subgraphTypes.push({
                ...node,
                directives: node.directives?.filter(
                  directiveNode => directiveNode.name.value !== 'join__type',
                ),
              });
            }
          });
        }
      });
    },
    InterfaceTypeDefinition: TypeWithFieldsVisitor,
    UnionTypeDefinition(node) {
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              const graphName = argumentNode.value.value;
              const unionMembers: NamedTypeNode[] = [];
              node.directives?.forEach(directiveNode => {
                if (directiveNode.name.value === 'join__unionMember') {
                  directiveNode.arguments?.forEach(argumentNode => {
                    if (argumentNode.name.value === 'graph') {
                      if (argumentNode?.value?.kind === Kind.ENUM) {
                        if (argumentNode.value.value === graphName) {
                          unionMembers.push({
                            kind: Kind.NAMED_TYPE,
                            name: node.name,
                          });
                        }
                      }
                    }
                  });
                }
              });
              if (unionMembers.length > 0) {
                let subgraphTypes = subgraphTypesMap.get(graphName);
                if (!subgraphTypes) {
                  subgraphTypes = [];
                  subgraphTypesMap.set(graphName, subgraphTypes);
                }
                subgraphTypes.push({
                  ...node,
                  types: unionMembers,
                  directives: node.directives?.filter(
                    directiveNode =>
                      directiveNode.name.value !== 'join__type' &&
                      directiveNode.name.value !== 'join__unionMember',
                  ),
                });
              }
            }
          });
        }
      });
    },
    EnumTypeDefinition(node) {
      if (node.name.value === 'join__Graph') {
        node.values?.forEach(valueNode => {
          valueNode.directives?.forEach(directiveNode => {
            if (directiveNode.name.value === 'join__graph') {
              directiveNode.arguments?.forEach(argumentNode => {
                if (argumentNode.name.value === 'url' && argumentNode.value?.kind === Kind.STRING) {
                  subgraphEndpointMap.set(valueNode.name.value, argumentNode.value.value);
                }
              });
            }
          });
        });
      }
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode.value?.kind === Kind.ENUM) {
              const graphName = argumentNode.value.value;
              const enumValueNodes: EnumValueDefinitionNode[] = [];
              node.values?.forEach(valueNode => {
                const joinEnumValueDirectives = valueNode.directives?.filter(
                  directiveNode => directiveNode.name.value === 'join__enumValue',
                );
                if (joinEnumValueDirectives?.length) {
                  joinEnumValueDirectives.forEach(joinEnumValueDirectiveNode => {
                    joinEnumValueDirectiveNode.arguments?.forEach(argumentNode => {
                      if (
                        argumentNode.name.value === 'graph' &&
                        argumentNode.value?.kind === Kind.ENUM &&
                        argumentNode.value.value === graphName
                      ) {
                        enumValueNodes.push({
                          ...valueNode,
                          directives: valueNode.directives?.filter(
                            directiveNode => directiveNode.name.value !== 'join__enumValue',
                          ),
                        });
                      }
                    });
                  });
                } else {
                  enumValueNodes.push(valueNode);
                }
              });
              const enumTypedDefNodeForSubgraph: EnumTypeDefinitionNode = {
                ...node,
                directives: node.directives?.filter(
                  directiveNode => directiveNode.name.value !== 'join__type',
                ),
                values: enumValueNodes,
              };
              let subgraphTypes = subgraphTypesMap.get(graphName);
              if (!subgraphTypes) {
                subgraphTypes = [];
                subgraphTypesMap.set(graphName, subgraphTypes);
              }
              subgraphTypes.push(enumTypedDefNodeForSubgraph);
            }
          });
        }
      });
    },
    ObjectTypeDefinition: TypeWithFieldsVisitor,
  });
  const subschemaMap = new Map<string, SubschemaConfig>();
  for (const [subgraphName, endpoint] of subgraphEndpointMap) {
    const executor = onExecutor({ subgraphName, endpoint });
    const mergeConfig: SubschemaConfig['merge'] = {};
    const typeNameKeyMap = typeNameKeysBySubgraphMap.get(subgraphName);
    const unionTypeNodes: NamedTypeNode[] = [];
    if (typeNameKeyMap) {
      const typeNameFieldsKeyMap = typeNameFieldsKeyBySubgraphMap.get(subgraphName);
      for (const [typeName, keys] of typeNameKeyMap) {
        const mergedTypeConfig: MergedTypeConfig = (mergeConfig[typeName] = {});
        const fieldsKeyMap = typeNameFieldsKeyMap?.get(typeName);
        const extraKeys: string[] = [];
        if (fieldsKeyMap) {
          const fieldsConfig = (mergedTypeConfig.fields = {});
          for (const [fieldName, fieldNameKey] of fieldsKeyMap) {
            extraKeys.push(fieldNameKey);
            fieldsConfig[fieldName] = {
              selectionSet: `{ ${fieldNameKey} }`,
              computed: true,
            };
          }
        }
        if (typeNameCanonicalMap.get(typeName) === subgraphName) {
          mergedTypeConfig.canonical = true;
        }

        mergedTypeConfig.entryPoints = keys.map(key => ({
          selectionSet: `{ ${key} }`,
          argsFromKeys: getArgsFromKeysForFederation,
          key: getKeyFnForFederation(typeName, [key, ...extraKeys]),
          fieldName: `_entities`,
          dataLoaderOptions: {
            cacheKeyFn: getCacheKeyFnFromKey(key),
          },
        }));

        unionTypeNodes.push({
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: typeName,
          },
        });
      }
    }
    const entitiesUnionTypeDefinitionNode: UnionTypeDefinitionNode = {
      name: {
        kind: Kind.NAME,
        value: '_Entity',
      },
      kind: Kind.UNION_TYPE_DEFINITION,
      types: unionTypeNodes,
    };
    let subgraphRootFieldDefinitionNodeMap = subgraphRootFieldDefinitionNodes.get(subgraphName);
    if (!subgraphRootFieldDefinitionNodeMap) {
      subgraphRootFieldDefinitionNodeMap = new Map();
      subgraphRootFieldDefinitionNodes.set(subgraphName, subgraphRootFieldDefinitionNodeMap);
    }
    let queryFields = subgraphRootFieldDefinitionNodeMap.get('query' as OperationTypeNode);
    if (!queryFields) {
      queryFields = [];
      subgraphRootFieldDefinitionNodeMap.set('query' as OperationTypeNode, queryFields);
    }
    queryFields.push({
      kind: Kind.FIELD_DEFINITION,
      name: {
        kind: Kind.NAME,
        value: '_entities',
      },
      type: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: '_Entity',
        },
      },
      arguments: [
        {
          kind: Kind.INPUT_VALUE_DEFINITION,
          name: {
            kind: Kind.NAME,
            value: 'representations',
          },
          type: {
            kind: Kind.NON_NULL_TYPE,
            type: {
              kind: Kind.LIST_TYPE,
              type: {
                kind: Kind.NON_NULL_TYPE,
                type: {
                  kind: Kind.NAMED_TYPE,
                  name: {
                    kind: Kind.NAME,
                    value: '_Any',
                  },
                },
              },
            },
          },
        },
      ],
    });
    const rootTypes: TypeDefinitionNode[] = [];
    for (const [operationType, fieldDefinitionNodes] of subgraphRootFieldDefinitionNodeMap) {
      rootTypes.push({
        kind: Kind.OBJECT_TYPE_DEFINITION,
        name: {
          kind: Kind.NAME,
          value: rootTypeNames.get(operationType)!,
        },
        fields: fieldDefinitionNodes,
      });
    }
    const subgraphTypes = subgraphTypesMap.get(subgraphName) || [];
    const typeNameExtraFieldsMap = subgraphTypeNameExtraFieldsMap.get(subgraphName);
    if (typeNameExtraFieldsMap) {
      subgraphTypes.forEach(typeNode => {
        if ('fields' in typeNode) {
          const extraFields = typeNameExtraFieldsMap.get(typeNode.name.value);
          if (extraFields) {
            (typeNode.fields as FieldDefinitionNode[]).push(...extraFields);
          }
        }
      });
    }
    const schema = buildASTSchema(
      {
        kind: Kind.DOCUMENT,
        definitions: [
          ...subgraphTypes,
          entitiesUnionTypeDefinitionNode,
          anyTypeDefinitionNode,
          ...rootTypes,
        ],
      },
      {
        assumeValidSDL: true,
        assumeValid: true,
      },
    );
    subschemaMap.set(subgraphName, {
      schema,
      executor,
      merge: mergeConfig,
      batch,
    });
  }
  return subschemaMap;
}

export function getStitchedSchemaFromSupergraphSdl(opts: GetSubschemasFromSupergraphSdlOpts) {
  const subschemaMap = getSubschemasFromSupergraphSdl(opts);
  const supergraphSchema = stitchSchemas({
    subschemas: [...subschemaMap.values()],
    assumeValid: true,
    assumeValidSDL: true,
  });
  return filterInternalFieldsAndTypes(supergraphSchema);
}

const anyTypeDefinitionNode: ScalarTypeDefinitionNode = {
  name: {
    kind: Kind.NAME,
    value: '_Any',
  },
  kind: Kind.SCALAR_TYPE_DEFINITION,
};
