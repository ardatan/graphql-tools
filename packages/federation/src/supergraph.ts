import {
  buildASTSchema,
  DefinitionNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  FieldNode,
  GraphQLOutputType,
  GraphQLSchema,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  OperationTypeNode,
  parse,
  parseType,
  print,
  ScalarTypeDefinitionNode,
  SelectionNode,
  SelectionSetNode,
  TypeDefinitionNode,
  TypeInfo,
  UnionTypeDefinitionNode,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import {
  BatchingOptions,
  delegateToSchema,
  extractUnavailableFieldsFromSelectionSet,
  MergedFieldConfig,
  MergedTypeConfig,
  SubschemaConfig,
  subtractSelectionSets,
} from '@graphql-tools/delegate';
import { buildHTTPExecutor, HTTPExecutorOptions } from '@graphql-tools/executor-http';
import {
  calculateSelectionScore,
  getDefaultFieldConfigMerger,
  MergeFieldConfigCandidate,
  stitchSchemas,
  TypeMergingOptions,
  ValidationLevel,
} from '@graphql-tools/stitch';
import {
  createGraphQLError,
  isPromise,
  memoize1,
  mergeDeep,
  parseSelectionSet,
  type Executor,
} from '@graphql-tools/utils';
import {
  filterInternalFieldsAndTypes,
  getArgsFromKeysForFederation,
  getCacheKeyFnFromKey,
  getKeyFnForFederation,
  getNamedTypeNode,
} from './utils.js';

export function ensureSupergraphSDLAst(supergraphSdl: string | DocumentNode): DocumentNode {
  return typeof supergraphSdl === 'string'
    ? parse(supergraphSdl, { noLocation: true })
    : supergraphSdl;
}

const rootTypeMap = new Map<string, OperationTypeNode>([
  ['Query', 'query' as OperationTypeNode],
  ['Mutation', 'mutation' as OperationTypeNode],
  ['Subscription', 'subscription' as OperationTypeNode],
]);

const memoizedASTPrint = memoize1(print);
const memoizedTypePrint = memoize1((type: GraphQLOutputType) => type.toString());

export interface FederationSubschemaConfig extends Omit<SubschemaConfig, 'executor' | 'name'> {
  executor: Executor;
  name: string;
  endpoint: string;
}

export interface GetStitchingOptionsFromSupergraphSdlOpts {
  supergraphSdl: string | DocumentNode;
  httpExecutorOpts?:
    | Partial<HTTPExecutorOptions>
    | ((subgraphInfo: { name: string; endpoint?: string }) => Partial<HTTPExecutorOptions>);
  onSubschemaConfig?: (subschemaConfig: FederationSubschemaConfig) => void;
  onMergedTypeConfig?: (typeName: string, mergedTypeConfig: MergedTypeConfig) => void;
  /**
   * Enable query batching for all subschemas.
   *
   * @default false
   */
  batch?: boolean;
  /**
   * Configure the query batching options for all subschemas.
   */
  batchingOptions?: BatchingOptions;
  /**
   * Configure the batch delegation options for all merged types in all subschemas.
   */
  batchDelegateOptions?: MergedTypeConfig['dataLoaderOptions'];
}

export function getStitchingOptionsFromSupergraphSdl(
  opts: GetStitchingOptionsFromSupergraphSdlOpts,
) {
  const supergraphAst = ensureSupergraphSDLAst(opts.supergraphSdl);
  const subgraphEndpointMap = new Map<string, string>();
  const subgraphTypesMap = new Map<string, TypeDefinitionNode[]>();
  const typeNameKeysBySubgraphMap = new Map<string, Map<string, string[]>>();
  const typeNameFieldsKeyBySubgraphMap = new Map<string, Map<string, Map<string, string>>>();
  const typeNameCanonicalMap = new Map<string, string>();
  const subgraphTypeNameExtraFieldsMap = new Map<string, Map<string, FieldDefinitionNode[]>>();
  const subgraphTypeNameProvidedMap = new Map<string, Map<string, Set<string>>>();
  const orphanTypeMap = new Map<string, TypeDefinitionNode>();
  const typeFieldASTMap = new Map<
    string,
    Map<string, FieldDefinitionNode | InputValueDefinitionNode>
  >();

  for (const definition of supergraphAst.definitions) {
    if ('fields' in definition) {
      const fieldMap = new Map<string, FieldDefinitionNode | InputValueDefinitionNode>();
      typeFieldASTMap.set(definition.name.value, fieldMap);
      for (const field of definition.fields || []) {
        fieldMap.set(field.name.value, field);
      }
    }
  }

  // To detect unresolvable interface fields
  const subgraphExternalFieldMap = new Map<string, Map<string, Set<string>>>();

  // TODO: Temporary fix to add missing join__type directives to Query
  const subgraphNames: string[] = [];
  visit(supergraphAst, {
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
          if (
            typeNode.kind === Kind.OBJECT_TYPE_DEFINITION ||
            typeNode.kind === Kind.INTERFACE_TYPE_DEFINITION
          ) {
            const keyArgumentNode = directiveNode.arguments?.find(
              argumentNode => argumentNode.name.value === 'key',
            );
            const isResolvable = !directiveNode.arguments?.some(
              argumentNode =>
                argumentNode.name.value === 'resolvable' &&
                argumentNode.value?.kind === Kind.BOOLEAN &&
                argumentNode.value.value === false,
            );
            if (isResolvable && keyArgumentNode?.value?.kind === Kind.STRING) {
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
                const isOverridden = joinFieldDirectiveNode.arguments?.some(
                  argumentNode =>
                    argumentNode.name.value === 'usedOverridden' &&
                    argumentNode.value?.kind === Kind.BOOLEAN &&
                    argumentNode.value.value === true,
                );
                if (isExternal) {
                  let externalFieldsByType = subgraphExternalFieldMap.get(graphName);
                  if (!externalFieldsByType) {
                    externalFieldsByType = new Map();
                    subgraphExternalFieldMap.set(graphName, externalFieldsByType);
                  }
                  let externalFields = externalFieldsByType.get(typeNode.name.value);
                  if (!externalFields) {
                    externalFields = new Set();
                    externalFieldsByType.set(typeNode.name.value, externalFields);
                  }
                  externalFields.add(fieldNode.name.value);
                }
                if (!isExternal && !isOverridden) {
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
                  const providesSelectionSet = parseSelectionSet(
                    /* GraphQL */ `{ ${providedExtraField.value.value} }`,
                  );
                  function handleSelection(fieldNodeTypeName: string, selection: SelectionNode) {
                    let typeNameExtraFieldsMap = subgraphTypeNameExtraFieldsMap.get(graphName);
                    if (!typeNameExtraFieldsMap) {
                      typeNameExtraFieldsMap = new Map();
                      subgraphTypeNameExtraFieldsMap.set(graphName, typeNameExtraFieldsMap);
                    }
                    switch (selection.kind) {
                      case Kind.FIELD:
                        {
                          const extraFieldTypeNode = supergraphAst.definitions.find(
                            def => 'name' in def && def.name?.value === fieldNodeTypeName,
                          ) as ObjectTypeDefinitionNode;
                          const extraFieldNodeInType = extraFieldTypeNode.fields?.find(
                            fieldNode => fieldNode.name.value === selection.name.value,
                          );
                          if (extraFieldNodeInType) {
                            let extraFields = typeNameExtraFieldsMap.get(fieldNodeTypeName);
                            if (!extraFields) {
                              extraFields = [];
                              typeNameExtraFieldsMap.set(fieldNodeTypeName, extraFields);
                            }
                            extraFields.push({
                              ...extraFieldNodeInType,
                              directives: extraFieldNodeInType.directives?.filter(
                                directiveNode => directiveNode.name.value !== 'join__field',
                              ),
                            });

                            let typeNameProvidedMap = subgraphTypeNameProvidedMap.get(graphName);
                            if (!typeNameProvidedMap) {
                              typeNameProvidedMap = new Map();
                              subgraphTypeNameProvidedMap.set(graphName, typeNameProvidedMap);
                            }
                            let providedFields = typeNameProvidedMap.get(fieldNodeTypeName);
                            if (!providedFields) {
                              providedFields = new Set();
                              typeNameProvidedMap.set(fieldNodeTypeName, providedFields);
                            }
                            providedFields.add(selection.name.value);

                            if (selection.selectionSet) {
                              const extraFieldNodeNamedType = getNamedTypeNode(
                                extraFieldNodeInType.type,
                              );
                              const extraFieldNodeTypeName = extraFieldNodeNamedType.name.value;
                              for (const subSelection of selection.selectionSet.selections) {
                                handleSelection(extraFieldNodeTypeName, subSelection);
                              }
                            }
                          }
                        }
                        break;
                      case Kind.INLINE_FRAGMENT:
                        {
                          const fragmentType =
                            selection.typeCondition?.name?.value || fieldNodeType.name.value;
                          if (selection.selectionSet) {
                            for (const subSelection of selection.selectionSet.selections) {
                              handleSelection(fragmentType, subSelection);
                            }
                          }
                        }
                        break;
                    }
                  }
                  const fieldNodeType = getNamedTypeNode(fieldNode.type);
                  const fieldNodeTypeName = fieldNodeType.name.value;
                  for (const selection of providesSelectionSet.selections) {
                    handleSelection(fieldNodeTypeName, selection);
                  }
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
  visit(supergraphAst, {
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
  const subschemas: SubschemaConfig[] = [];
  for (const [subgraphName, endpoint] of subgraphEndpointMap) {
    const mergeConfig: SubschemaConfig['merge'] = {};
    const typeNameKeyMap = typeNameKeysBySubgraphMap.get(subgraphName);
    const unionTypeNodes: NamedTypeNode[] = [];
    if (typeNameKeyMap) {
      const typeNameFieldsKeyMap = typeNameFieldsKeyBySubgraphMap.get(subgraphName);
      for (const [typeName, keys] of typeNameKeyMap) {
        const mergedTypeConfig: MergedTypeConfig = (mergeConfig[typeName] = {});
        const fieldsKeyMap = typeNameFieldsKeyMap?.get(typeName);
        const extraKeys = new Set<string>();
        if (fieldsKeyMap) {
          const fieldsConfig: Record<string, MergedFieldConfig> = (mergedTypeConfig.fields = {});
          for (const [fieldName, fieldNameKey] of fieldsKeyMap) {
            extraKeys.add(fieldNameKey);
            fieldsConfig[fieldName] = {
              selectionSet: `{ ${fieldNameKey} }`,
              computed: true,
            };
          }
        }
        if (typeNameCanonicalMap.get(typeName) === subgraphName) {
          mergedTypeConfig.canonical = true;
        }

        function getMergedTypeConfigFromKey(key: string) {
          return {
            selectionSet: `{ ${key} }`,
            argsFromKeys: getArgsFromKeysForFederation,
            key: getKeyFnForFederation(typeName, [key, ...extraKeys]),
            fieldName: `_entities`,
            dataLoaderOptions: {
              cacheKeyFn: getCacheKeyFnFromKey(key),
              ...(opts.batchDelegateOptions || {}),
            },
          };
        }

        if (keys.length === 1) {
          const key = keys[0];
          Object.assign(mergedTypeConfig, getMergedTypeConfigFromKey(key));
        }
        if (keys.length > 1) {
          const entryPoints = keys.map(key => getMergedTypeConfigFromKey(key));
          mergedTypeConfig.entryPoints = entryPoints;
        }

        unionTypeNodes.push({
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: typeName,
          },
        });

        opts.onMergedTypeConfig?.(typeName, mergedTypeConfig);
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
    const extendedSubgraphTypes = [...subgraphTypes, ...extraOrphanTypesForSubgraph.values()];
    // We should add implemented objects from other subgraphs implemented by this interface
    for (const interfaceInSubgraph of extendedSubgraphTypes) {
      if (interfaceInSubgraph.kind === Kind.INTERFACE_TYPE_DEFINITION) {
        let isOrphan = true;
        for (const definitionNode of supergraphAst.definitions) {
          if (
            definitionNode.kind === Kind.OBJECT_TYPE_DEFINITION &&
            definitionNode.interfaces?.some(
              interfaceNode => interfaceNode.name.value === interfaceInSubgraph.name.value,
            )
          ) {
            isOrphan = false;
          }
        }
        if (isOrphan) {
          // @ts-expect-error `kind` property is a readonly field in TS definitions but it is not actually
          interfaceInSubgraph.kind = Kind.OBJECT_TYPE_DEFINITION;
        }
      }
    }
    let schema: GraphQLSchema;
    const schemaAst: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [
        ...extendedSubgraphTypes,
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
        `Error building schema for subgraph ${subgraphName}: ${e?.stack || e?.message || e.toString()}`,
      );
    }
    let httpExecutorOpts: Partial<HTTPExecutorOptions>;
    if (typeof opts.httpExecutorOpts === 'function') {
      httpExecutorOpts = opts.httpExecutorOpts({
        name: subgraphName,
        endpoint,
      });
    } else {
      httpExecutorOpts = opts.httpExecutorOpts || {};
    }
    let executor: Executor = buildHTTPExecutor({
      endpoint,
      ...httpExecutorOpts,
    });
    if (globalThis.process?.env?.['DEBUG']) {
      const origExecutor = executor;
      executor = async function debugExecutor(execReq) {
        console.log(`Executing ${subgraphName} with args:`, {
          document: print(execReq.document),
          variables: JSON.stringify(execReq.variables, null, 2),
        });
        const res = await origExecutor(execReq);
        console.log(`Response from ${subgraphName}:`, JSON.stringify(res, null, 2));
        return res;
      };
    }
    const typeNameProvidedMap = subgraphTypeNameProvidedMap.get(subgraphName);
    const externalFieldMap = subgraphExternalFieldMap.get(subgraphName);
    const subschemaConfig: FederationSubschemaConfig = {
      name: subgraphName,
      endpoint,
      schema,
      executor,
      merge: mergeConfig,
      transforms: [
        {
          transformRequest(request) {
            const typeInfo = new TypeInfo(schema);
            return {
              ...request,
              document: visit(
                request.document,
                visitWithTypeInfo(typeInfo, {
                  [Kind.DIRECTIVE](node) {
                    if (node.name.value === 'defer') {
                      // @defer is not available for the communication between the gw and subgraph
                      return null;
                    }
                  },
                  // To avoid resolving unresolvable interface fields
                  [Kind.FIELD](node) {
                    if (node.name.value !== '__typename') {
                      const parentType = typeInfo.getParentType();
                      if (isInterfaceType(parentType)) {
                        const providedInterfaceFields = typeNameProvidedMap?.get(parentType.name);
                        const implementations = schema.getPossibleTypes(parentType);
                        for (const implementation of implementations) {
                          const externalFields = externalFieldMap?.get(implementation.name);
                          const providedFields = typeNameProvidedMap?.get(implementation.name);
                          if (
                            !providedInterfaceFields?.has(node.name.value) &&
                            !providedFields?.has(node.name.value) &&
                            externalFields?.has(node.name.value)
                          ) {
                            throw createGraphQLError(
                              `Was not able to find any options for ${node.name.value}: This shouldn't have happened.`,
                              {
                                extensions: {
                                  CRITICAL_ERROR: true,
                                },
                              },
                            );
                          }
                        }
                      }
                    }
                  },
                }),
              ),
            };
          },
        },
      ],
      batch: opts.batch,
      batchingOptions: opts.batchingOptions,
    };
    opts.onSubschemaConfig?.(subschemaConfig);
    subschemas.push(subschemaConfig);
  }

  const defaultMerger = getDefaultFieldConfigMerger(true);
  const fieldConfigMerger: TypeMergingOptions['fieldConfigMerger'] = function (
    candidates: MergeFieldConfigCandidate[],
  ) {
    if (
      candidates.length === 1 ||
      candidates.some(candidate => candidate.fieldName === '_entities')
    ) {
      return candidates[0].fieldConfig;
    }
    if (candidates.some(candidate => rootTypeMap.has(candidate.type.name))) {
      const candidateNames = new Set<string>();
      const realCandidates: MergeFieldConfigCandidate[] = [];
      for (const candidate of candidates.toReversed
        ? candidates.toReversed()
        : [...candidates].reverse()) {
        if (
          candidate.transformedSubschema?.name &&
          !candidateNames.has(candidate.transformedSubschema.name)
        ) {
          candidateNames.add(candidate.transformedSubschema.name);
          realCandidates.push(candidate);
        }
      }
      const defaultMergedField = defaultMerger(candidates);
      return {
        ...defaultMergedField,
        resolve(_root, _args, context, info) {
          let currentSubschema: SubschemaConfig | undefined;
          let currentScore = Infinity;
          let currentUnavailableSelectionSet: SelectionSetNode | undefined;
          let currentFriendSubschemas: Map<SubschemaConfig, SelectionSetNode> | undefined;
          let currentAvailableSelectionSet: SelectionSetNode | undefined;
          const originalSelectionSet: SelectionSetNode = {
            kind: Kind.SELECTION_SET,
            selections: info.fieldNodes,
          };
          // Find the best subschema to delegate this selection
          for (const candidate of realCandidates) {
            if (candidate.transformedSubschema) {
              const unavailableFields = extractUnavailableFieldsFromSelectionSet(
                candidate.transformedSubschema.transformedSchema,
                candidate.type,
                originalSelectionSet,
                () => true,
              );
              const score = calculateSelectionScore(unavailableFields);
              if (score < currentScore) {
                currentScore = score;
                currentSubschema = candidate.transformedSubschema;
                currentFriendSubschemas = new Map();
                currentUnavailableSelectionSet = {
                  kind: Kind.SELECTION_SET,
                  selections: unavailableFields,
                };
                currentAvailableSelectionSet = subtractSelectionSets(
                  originalSelectionSet,
                  currentUnavailableSelectionSet,
                );
                // Make parallel requests if there are other subschemas
                // that can resolve the remaining fields for this selection directly from the root field
                // instead of applying a type merging in advance
                for (const friendCandidate of realCandidates) {
                  if (friendCandidate === candidate || !friendCandidate.transformedSubschema) {
                    continue;
                  }
                  const unavailableFieldsInFriend = extractUnavailableFieldsFromSelectionSet(
                    friendCandidate.transformedSubschema.transformedSchema,
                    friendCandidate.type,
                    currentUnavailableSelectionSet,
                    () => true,
                  );
                  const friendScore = calculateSelectionScore(unavailableFieldsInFriend);
                  if (friendScore < score) {
                    const unavailableInFriendSelectionSet: SelectionSetNode = {
                      kind: Kind.SELECTION_SET,
                      selections: unavailableFieldsInFriend,
                    };
                    const subschemaSelectionSet = subtractSelectionSets(
                      currentUnavailableSelectionSet,
                      unavailableInFriendSelectionSet,
                    );
                    currentFriendSubschemas.set(
                      friendCandidate.transformedSubschema,
                      subschemaSelectionSet,
                    );
                    currentUnavailableSelectionSet = unavailableInFriendSelectionSet;
                  }
                }
              }
            }
          }
          if (!currentSubschema) {
            throw new Error('Could not determine subschema');
          }
          const jobs: Promise<void>[] = [];
          let hasPromise = false;
          const mainJob = delegateToSchema({
            schema: currentSubschema,
            operation: rootTypeMap.get(info.parentType.name) || ('query' as OperationTypeNode),
            context,
            info: currentFriendSubschemas?.size
              ? {
                  ...info,
                  fieldNodes: [
                    ...(currentAvailableSelectionSet?.selections || []),
                    ...(currentUnavailableSelectionSet?.selections || []),
                  ] as FieldNode[],
                }
              : info,
          });
          if (isPromise(mainJob)) {
            hasPromise = true;
          }
          jobs.push(mainJob);
          if (currentFriendSubschemas?.size) {
            for (const [friendSubschema, friendSelectionSet] of currentFriendSubschemas) {
              const friendJob = delegateToSchema({
                schema: friendSubschema,
                operation: rootTypeMap.get(info.parentType.name) || ('query' as OperationTypeNode),
                context,
                info: {
                  ...info,
                  fieldNodes: friendSelectionSet.selections as FieldNode[],
                },
                skipTypeMerging: true,
              });
              if (isPromise(friendJob)) {
                hasPromise = true;
              }
              jobs.push(friendJob);
            }
          }
          if (jobs.length === 1) {
            return jobs[0];
          }
          if (hasPromise) {
            return Promise.all(jobs).then(results => mergeResults(results));
          }
          return mergeResults(jobs);
        },
      };
    }
    const filteredCandidates = candidates.filter(candidate => {
      const fieldASTMap = typeFieldASTMap.get(candidate.type.name);
      if (fieldASTMap) {
        const fieldAST = fieldASTMap.get(candidate.fieldName);
        if (fieldAST) {
          const typeNodeInAST = memoizedASTPrint(fieldAST.type);
          const typeNodeInCandidate = memoizedTypePrint(candidate.fieldConfig.type);
          return typeNodeInAST === typeNodeInCandidate;
        }
      }
      return false;
    });
    return defaultMerger(filteredCandidates.length ? filteredCandidates : candidates);
  };

  function doesFieldExistInSupergraph(typeName: string, fieldName: string) {
    for (const subschemaConfig of subschemas) {
      const type = subschemaConfig.schema.getType(typeName);
      if (type && 'getFields' in type) {
        if (type.getFields()[fieldName]) {
          return true;
        }
      }
    }
    return false;
  }

  function getTypeInSupergraph(typeName: string) {
    for (const subschemaConfig of subschemas) {
      const type = subschemaConfig.schema.getType(typeName);
      if (type) {
        return type;
      }
    }
    return undefined;
  }

  const extraDefinitions: DefinitionNode[] = [];
  for (const definition of supergraphAst.definitions) {
    if ('name' in definition && definition.name && definition.kind !== Kind.DIRECTIVE_DEFINITION) {
      const typeName = definition.name.value;
      const typeInSchema = getTypeInSupergraph(typeName);
      if (!typeInSchema) {
        extraDefinitions.push(definition);
      } else if ('fields' in definition && definition.fields) {
        const extraFields: (FieldDefinitionNode | InputValueDefinitionNode)[] = [];
        for (const field of definition.fields) {
          if (!doesFieldExistInSupergraph(typeName, field.name.value)) {
            extraFields.push(field);
          }
        }
        if (extraFields.length) {
          let definitionKind: DefinitionNode['kind'] | undefined;
          if (isObjectType(typeInSchema)) {
            definitionKind = Kind.OBJECT_TYPE_DEFINITION;
          } else if (isInterfaceType(typeInSchema)) {
            definitionKind = Kind.INTERFACE_TYPE_DEFINITION;
          } else if (isInputObjectType(typeInSchema)) {
            definitionKind = Kind.INPUT_OBJECT_TYPE_DEFINITION;
          }
          if (definitionKind) {
            extraDefinitions.push({
              kind: definitionKind,
              name: definition.name,
              fields: extraFields,
              // `fields` are different in input object types and regular types
            } as DefinitionNode);
          }
        }
      }
    }
  }
  const additionalTypeDefs: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: extraDefinitions,
  };
  return {
    subschemas,
    typeDefs: additionalTypeDefs,
    assumeValid: true,
    assumeValidSDL: true,
    typeMergingOptions: {
      useNonNullableFieldOnConflict: true,
      validationSettings: {
        validationLevel: ValidationLevel.Off,
      },
      fieldConfigMerger,
    },
  };
}

export interface GetStitchedSchemaFromSupergraphSdlOpts
  extends GetStitchingOptionsFromSupergraphSdlOpts {
  supergraphSdl: string | DocumentNode;
  onStitchingOptions?(opts: ReturnType<typeof getStitchingOptionsFromSupergraphSdl>): void;
}

export function getStitchedSchemaFromSupergraphSdl(opts: GetStitchedSchemaFromSupergraphSdlOpts) {
  const stitchSchemasOpts = getStitchingOptionsFromSupergraphSdl(opts);
  opts.onStitchingOptions?.(stitchSchemasOpts);
  const supergraphSchema = stitchSchemas(stitchSchemasOpts);
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

function mergeResults(results: unknown[]) {
  const errors: Error[] = [];
  const datas: unknown[] = [];
  for (const result of results) {
    if (result instanceof AggregateError) {
      errors.push(...result.errors);
    } else if (result instanceof Error) {
      errors.push(result);
    } else {
      datas.push(result);
    }
  }
  if (datas.length) {
    return mergeDeep(datas, false, true, true);
  }
  if (errors.length) {
    return new AggregateError(errors, errors.map(error => error.message).join(', \n'));
  }
  return null;
}
