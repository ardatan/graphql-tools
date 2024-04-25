import {
  buildASTSchema,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  GraphQLSchema,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  parse,
  parseType,
  print,
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
  onExecutor?: (opts: {
    subgraphName: string;
    endpoint: string;
    subgraphSchema: GraphQLSchema;
  }) => Executor;
  batch?: boolean;
}

export function getSubschemasFromSupergraphSdl({
  supergraphSdl,
  onExecutor = ({ endpoint }) => buildHTTPExecutor({ endpoint }),
  batch = false,
}: GetSubschemasFromSupergraphSdlOpts) {
  const ast =
    typeof supergraphSdl === 'string' ? parse(supergraphSdl, { noLocation: true }) : supergraphSdl;
  const subgraphEndpointMap = new Map<string, string>();
  const subgraphTypesMap = new Map<string, TypeDefinitionNode[]>();
  const typeNameKeysBySubgraphMap = new Map<string, Map<string, string[]>>();
  const typeNameFieldsKeyBySubgraphMap = new Map<string, Map<string, Map<string, string>>>();
  const typeNameCanonicalMap = new Map<string, string>();
  const subgraphTypeNameExtraFieldsMap = new Map<string, Map<string, FieldDefinitionNode[]>>();
  const orphanTypeMap = new Map<string, TypeDefinitionNode>();
  // TODO: Temporary fix to add missing join__type directives to Query
  const subgraphNames: string[] = [];
  visit(ast, {
    EnumTypeDefinition(node) {
      if (node.name.value === 'join__Graph') {
        node.values?.forEach(valueNode => {
          subgraphNames.push(valueNode.name.value);
        });
      }
    },
  });
  // END TODO
  function TypeWithFieldsVisitor(typeNode: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) {
    // TODO: Temporary fix to add missing join__type directives to Query
    if (
      typeNode.name.value === 'Query' ||
      (typeNode.name.value === 'Mutation' &&
        !typeNode.directives?.some(directiveNode => directiveNode.name.value === 'join__type'))
    ) {
      (typeNode as any).directives = [
        ...(typeNode.directives || []),
        ...subgraphNames.map(subgraphName => ({
          kind: Kind.DIRECTIVE,
          name: {
            kind: Kind.NAME,
            value: 'join__type',
          },
          arguments: [
            {
              kind: Kind.ARGUMENT,
              name: {
                kind: Kind.NAME,
                value: 'graph',
              },
              value: {
                kind: Kind.ENUM,
                value: subgraphName,
              },
            },
          ],
        })),
      ];
    }
    let isOrphan = true;
    // END TODO
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
        isOrphan = false;
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
              directiveNode =>
                directiveNode.name.value === 'join__field' && directiveNode.arguments?.length,
            );
            let notInSubgraph = true;
            joinFieldDirectives?.forEach(joinFieldDirectiveNode => {
              const joinFieldGraphArgNode = joinFieldDirectiveNode.arguments?.find(
                argumentNode => argumentNode.name.value === 'graph',
              );
              if (
                joinFieldGraphArgNode?.value?.kind === Kind.ENUM &&
                joinFieldGraphArgNode.value.value === graphName
              ) {
                notInSubgraph = false;
                const isExternal = joinFieldDirectiveNode.arguments?.some(
                  argumentNode =>
                    argumentNode.name.value === 'external' &&
                    argumentNode.value?.kind === Kind.BOOLEAN &&
                    argumentNode.value.value === true,
                );
                if (!isExternal) {
                  const typeArg = joinFieldDirectiveNode.arguments?.find(
                    argumentNode => argumentNode.name.value === 'type',
                  );
                  const typeNode =
                    typeArg?.value.kind === Kind.STRING
                      ? parseType(typeArg.value.value)
                      : fieldNode.type;
                  fieldDefinitionNodesOfSubgraph.push({
                    ...fieldNode,
                    type: typeNode,
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
            } else if (
              notInSubgraph &&
              typeNameKeysBySubgraphMap
                .get(graphName)
                ?.get(typeNode.name.value)
                ?.some(key => key.split(' ').includes(fieldNode.name.value))
            ) {
              fieldDefinitionNodesOfSubgraph.push({
                ...fieldNode,
                directives: fieldNode.directives?.filter(
                  directiveNode => directiveNode.name.value !== 'join__field',
                ),
              });
            }
          });
          if (fieldDefinitionNodesOfSubgraph.length > 0 || typeNode.name.value === 'Query') {
            fieldDefinitionNodesByGraphName.set(graphName, fieldDefinitionNodesOfSubgraph);
          }
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
      if (typeNode.name.value === 'Query') {
        fieldDefinitionNodesOfSubgraph.push(entitiesFieldDefinitionNode);
      }
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
    if (isOrphan) {
      orphanTypeMap.set(typeNode.name.value, typeNode);
    }
  }
  visit(ast, {
    ScalarTypeDefinition(node) {
      let isOrphan = !node.name.value.startsWith('link__') && !node.name.value.startsWith('join__');
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              isOrphan = false;
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
      if (isOrphan) {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    InputObjectTypeDefinition(node) {
      let isOrphan = true;
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              isOrphan = false;
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
      if (isOrphan) {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    InterfaceTypeDefinition: TypeWithFieldsVisitor,
    UnionTypeDefinition(node) {
      let isOrphan = true;
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              isOrphan = false;
              const graphName = argumentNode.value.value;
              const unionMembers: NamedTypeNode[] = [];
              node.directives?.forEach(directiveNode => {
                if (directiveNode.name.value === 'join__unionMember') {
                  const graphArgumentNode = directiveNode.arguments?.find(
                    argumentNode => argumentNode.name.value === 'graph',
                  );
                  const memberArgumentNode = directiveNode.arguments?.find(
                    argumentNode => argumentNode.name.value === 'member',
                  );
                  if (
                    graphArgumentNode?.value?.kind === Kind.ENUM &&
                    graphArgumentNode.value.value === graphName &&
                    memberArgumentNode?.value?.kind === Kind.STRING
                  ) {
                    unionMembers.push({
                      kind: Kind.NAMED_TYPE,
                      name: {
                        kind: Kind.NAME,
                        value: memberArgumentNode.value.value,
                      },
                    });
                  }
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
      if (isOrphan && node.name.value !== '_Entity') {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    EnumTypeDefinition(node) {
      let isOrphan = true;
      if (node.name.value === 'join__Graph') {
        node.values?.forEach(valueNode => {
          isOrphan = false;
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
          isOrphan = false;
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
      if (isOrphan) {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    ObjectTypeDefinition: TypeWithFieldsVisitor,
  });
  const subschemaMap = new Map<string, SubschemaConfig>();
  for (const [subgraphName, endpoint] of subgraphEndpointMap) {
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

    const extraOrphanTypesForSubgraph = new Map<string, TypeDefinitionNode>();
    function visitTypeDefinitionsForOrphanTypes(node: TypeDefinitionNode) {
      function visitNamedTypeNode(namedTypeNode: NamedTypeNode) {
        const typeName = namedTypeNode.name.value;
        if (specifiedTypeNames.includes(typeName)) {
          return node;
        }
        const orphanType = orphanTypeMap.get(typeName);
        if (orphanType) {
          if (!extraOrphanTypesForSubgraph.has(typeName)) {
            extraOrphanTypesForSubgraph.set(typeName, {} as any);
            const extraOrphanType = visitTypeDefinitionsForOrphanTypes(orphanType);
            extraOrphanTypesForSubgraph.set(typeName, extraOrphanType);
          }
        } else if (!subgraphTypes.some(typeNode => typeNode.name.value === typeName)) {
          return null;
        }
        return node;
      }
      function visitFieldDefs<TFieldDef extends InputValueDefinitionNode | FieldDefinitionNode>(
        nodeFields?: readonly TFieldDef[] | undefined,
      ): TFieldDef[] {
        const fields: TFieldDef[] = [];
        for (const field of nodeFields || []) {
          const isTypeNodeOk = visitNamedTypeNode(getNamedTypeNode(field.type) as NamedTypeNode);
          if (!isTypeNodeOk) {
            continue;
          }
          if (field.kind === Kind.FIELD_DEFINITION) {
            const args: InputValueDefinitionNode[] = visitFieldDefs(field.arguments);
            fields.push({
              ...field,
              arguments: args,
            });
          } else {
            fields.push(field);
          }
        }
        return fields;
      }
      function visitObjectAndInterfaceDefs(
        node:
          | ObjectTypeDefinitionNode
          | InterfaceTypeDefinitionNode
          | ObjectTypeExtensionNode
          | InterfaceTypeExtensionNode,
      ) {
        const fields: FieldDefinitionNode[] = visitFieldDefs(node.fields);
        const interfaces: NamedTypeNode[] = [];
        for (const iface of node.interfaces || []) {
          const isTypeNodeOk = visitNamedTypeNode(iface);
          if (!isTypeNodeOk) {
            continue;
          }
          interfaces.push(iface);
        }
        return {
          ...node,
          fields,
          interfaces,
        };
      }
      return visit(node, {
        [Kind.OBJECT_TYPE_DEFINITION]: visitObjectAndInterfaceDefs,
        [Kind.OBJECT_TYPE_EXTENSION]: visitObjectAndInterfaceDefs,
        [Kind.INTERFACE_TYPE_DEFINITION]: visitObjectAndInterfaceDefs,
        [Kind.INTERFACE_TYPE_EXTENSION]: visitObjectAndInterfaceDefs,
        [Kind.UNION_TYPE_DEFINITION](node) {
          const types: NamedTypeNode[] = [];
          for (const type of node.types || []) {
            const isTypeNodeOk = visitNamedTypeNode(type);
            if (!isTypeNodeOk) {
              continue;
            }
            types.push(type);
          }
          return {
            ...node,
            types,
          };
        },
        [Kind.UNION_TYPE_EXTENSION](node) {
          const types: NamedTypeNode[] = [];
          for (const type of node.types || []) {
            const isTypeNodeOk = visitNamedTypeNode(type);
            if (!isTypeNodeOk) {
              continue;
            }
            types.push(type);
          }
          return {
            ...node,
            types,
          };
        },
        [Kind.INPUT_OBJECT_TYPE_DEFINITION](node) {
          const fields = visitFieldDefs(node.fields);
          return {
            ...node,
            fields,
          };
        },
        [Kind.INPUT_OBJECT_TYPE_EXTENSION](node) {
          const fields = visitFieldDefs(node.fields);
          return {
            ...node,
            fields,
          };
        },
      });
    }
    const subgraphTypes = subgraphTypesMap.get(subgraphName) || [];
    const typeNameExtraFieldsMap = subgraphTypeNameExtraFieldsMap.get(subgraphName);
    subgraphTypes.forEach(typeNode => {
      if (typeNameExtraFieldsMap && 'fields' in typeNode) {
        const extraFields = typeNameExtraFieldsMap.get(typeNode.name.value);
        if (extraFields) {
          (typeNode.fields as FieldDefinitionNode[]).push(...extraFields);
        }
      }
      visitTypeDefinitionsForOrphanTypes(typeNode);
    });
    let schema: GraphQLSchema;
    const schemaAst: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [
        ...subgraphTypes,
        ...extraOrphanTypesForSubgraph.values(),
        entitiesUnionTypeDefinitionNode,
        anyTypeDefinitionNode,
      ],
    };
    try {
      schema = buildASTSchema(schemaAst, {
        assumeValidSDL: true,
        assumeValid: true,
      });
    } catch (e: any) {
      throw new Error(
        `Error building schema for subgraph ${subgraphName}: ${e?.message || e.toString()}`,
      );
    }
    let executor: Executor = onExecutor({ subgraphName, endpoint, subgraphSchema: schema });
    if (globalThis.process?.env?.['DEBUG']) {
      const origExecutor = executor;
      executor = function debugExecutor(execReq) {
        console.log(`Executing ${subgraphName} with args:`, {
          document: print(execReq.document),
          variables: execReq.variables,
        });
        return origExecutor(execReq);
      };
    }
    subschemaMap.set(subgraphName, {
      name: subgraphName,
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
    typeMergingOptions: {
      useNonNullableFieldOnConflict: true,
    },
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

const entitiesFieldDefinitionNode: FieldDefinitionNode = {
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
};

const specifiedTypeNames = ['ID', 'String', 'Float', 'Int', 'Boolean', '_Any', '_Entity'];
