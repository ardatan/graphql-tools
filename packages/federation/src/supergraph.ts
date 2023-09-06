import {
  buildASTSchema,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  OperationTypeNode,
  parse,
  ScalarTypeDefinitionNode,
  specifiedScalarTypes,
  TypeDefinitionNode,
  UnionTypeDefinitionNode,
  visit,
} from 'graphql';
import { MergedTypeConfig, SubschemaConfig } from '@graphql-tools/delegate';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { stitchSchemas } from '@graphql-tools/stitch';
import type { Executor } from '@graphql-tools/utils';
import {
  filterInternalFieldsAndTypes,
  getArgsFromKeysForFederation,
  getKeyForFederation,
  getNamedTypeNode,
} from './utils.js';

export interface GetSubschemasFromSupergraphSdlOpts {
  supergraphSdl: string | DocumentNode;
  onExecutor?: (opts: { subgraphName: string; endpoint: string }) => Executor;
  batch?: boolean;
}

const builtinScalarNames = specifiedScalarTypes.map(type => type.name);

function processDependencies(
  typeDefinitionNode: TypeDefinitionNode,
  unownedTypes: Map<string, TypeDefinitionNode>,
  typeDefinitionNodeMap: Map<string, TypeDefinitionNode>,
) {
  switch (typeDefinitionNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
    case Kind.INTERFACE_TYPE_DEFINITION: {
      typeDefinitionNode.fields?.forEach(fieldNode => {
        const fieldTypeDefinition = getNamedTypeNode(fieldNode.type);
        if (fieldTypeDefinition) {
          if (builtinScalarNames.includes(fieldTypeDefinition.name.value)) {
            return;
          }
          const unownedTypeDefinition = unownedTypes.get(fieldTypeDefinition.name.value);
          if (!unownedTypeDefinition) {
            throw new Error(
              `Type "${fieldTypeDefinition.name.value}" of the field ${fieldNode.name.value} of the type ${typeDefinitionNode.name.value} is not defined in the supergraph SDL`,
            );
          }
          if (!typeDefinitionNodeMap.has(unownedTypeDefinition.name.value)) {
            typeDefinitionNodeMap.set(unownedTypeDefinition.name.value, unownedTypeDefinition);
            processDependencies(unownedTypeDefinition, unownedTypes, typeDefinitionNodeMap);
          }
        }
        if ('arguments' in fieldNode) {
          fieldNode.arguments?.forEach(argumentNode => {
            const argumentTypeDefinition = getNamedTypeNode(argumentNode.type);
            if (argumentTypeDefinition) {
              if (builtinScalarNames.includes(argumentTypeDefinition.name.value)) {
                return;
              }
              const unownedTypeDefinition = unownedTypes.get(argumentTypeDefinition.name.value);
              if (!unownedTypeDefinition) {
                throw new Error(
                  `Type "${argumentTypeDefinition.name.value}" of the argument ${argumentNode.name.value} of the field ${fieldNode.name.value} of the type ${typeDefinitionNode.name.value} is not defined in the supergraph SDL`,
                );
              }
              if (!typeDefinitionNodeMap.has(unownedTypeDefinition.name.value)) {
                typeDefinitionNodeMap.set(unownedTypeDefinition.name.value, unownedTypeDefinition);
                processDependencies(unownedTypeDefinition, unownedTypes, typeDefinitionNodeMap);
              }
            }
          });
        }
      });
      break;
    }
    case Kind.UNION_TYPE_DEFINITION: {
      typeDefinitionNode.types?.forEach(elementOfUnionTypeNode => {
        const unownedTypeDefinition = unownedTypes.get(elementOfUnionTypeNode.name.value);
        if (!unownedTypeDefinition) {
          throw new Error(
            `Type "${elementOfUnionTypeNode.name.value}" of the element of ${typeDefinitionNode.name.value} is not defined in the supergraph SDL`,
          );
        }
        if (!typeDefinitionNodeMap.has(unownedTypeDefinition.name.value)) {
          typeDefinitionNodeMap.set(unownedTypeDefinition.name.value, unownedTypeDefinition);
          processDependencies(unownedTypeDefinition, unownedTypes, typeDefinitionNodeMap);
        }
      });
      break;
    }
  }
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
  const subgraphTypesMap = new Map<string, Map<string, TypeDefinitionNode>>();
  const typeNameKeyBySubgraphMap = new Map<string, Map<string, string>>();
  const typeNameFieldsKeyBySubgraphMap = new Map<string, Map<string, Map<string, string>>>();
  const typeNameCanonicalMap = new Map<string, string>();
  const typeMap = new Map<string, TypeDefinitionNode>();
  const rootTypeNames = new Map<OperationTypeNode, string>();
  visit(ast, {
    SchemaDefinition(node) {
      node.operationTypes?.forEach(operationTypeNode => {
        rootTypeNames.set(operationTypeNode.operation, operationTypeNode.type.name.value);
      });
    },
    ScalarTypeDefinition(node) {
      typeMap.set(node.name.value, node);
    },
    InputObjectTypeDefinition(node) {
      typeMap.set(node.name.value, node);
    },
    InterfaceTypeDefinition(node) {
      typeMap.set(node.name.value, node);
    },
    UnionTypeDefinition(node) {
      typeMap.set(node.name.value, node);
    },
    EnumTypeDefinition(node) {
      typeMap.set(node.name.value, node);
      if (node.name.value === 'join__Graph') {
        node.values?.forEach(valueNode => {
          const joinGraphDirectiveNode = valueNode.directives?.find(
            directiveNode => directiveNode.name.value === 'join__graph',
          );
          if (joinGraphDirectiveNode) {
            const urlArgumentNode = joinGraphDirectiveNode.arguments?.find(
              argumentNode => argumentNode.name.value === 'url',
            );
            if (urlArgumentNode?.value?.kind === Kind.STRING) {
              subgraphEndpointMap.set(valueNode.name.value, urlArgumentNode.value.value);
            }
          }
        });
      }
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          const graphArgumentNode = directiveNode.arguments?.find(
            argumentNode => argumentNode.name.value === 'graph',
          );
          if (graphArgumentNode?.value?.kind === Kind.ENUM) {
            const graphName = graphArgumentNode.value.value;
            const enumValueNodes: EnumValueDefinitionNode[] =
              node.values?.filter(valueNode => {
                const joinEnumValueDirectiveNode = valueNode.directives?.find(
                  directiveNode => directiveNode.name.value === 'join__enumValue',
                );
                if (joinEnumValueDirectiveNode) {
                  const graphArgumentNode = joinEnumValueDirectiveNode.arguments?.find(
                    argumentNode => argumentNode.name.value === 'graph',
                  );
                  if (graphArgumentNode?.value?.kind === Kind.ENUM) {
                    return graphArgumentNode.value.value === graphName;
                  }
                }
                return false;
              }) || [];
            const enumTypedDefNodeForSubgraph: EnumTypeDefinitionNode = {
              ...node,
              values: enumValueNodes,
            };
            let subgraphTypeMap = subgraphTypesMap.get(graphName);
            if (!subgraphTypeMap) {
              subgraphTypeMap = new Map();
              subgraphTypesMap.set(graphName, subgraphTypeMap);
            }
            subgraphTypeMap.set(
              enumTypedDefNodeForSubgraph.name.value,
              enumTypedDefNodeForSubgraph,
            );
          }
        }
      });
    },
    ObjectTypeDefinition(node) {
      typeMap.set(node.name.value, node);
      if ([...rootTypeNames.values()].includes(node.name.value)) {
        const operationTypeName = [...rootTypeNames.entries()].find(
          ([, rootTypeName]) => rootTypeName === node.name.value,
        )![0];
        node.fields?.forEach(fieldNode => {
          fieldNode.directives?.forEach(directiveNode => {
            if (directiveNode.name.value === 'join__field') {
              const graphArgumentNode = directiveNode.arguments?.find(
                argumentNode => argumentNode.name.value === 'graph',
              );
              if (graphArgumentNode?.value?.kind === Kind.ENUM) {
                const graphName = graphArgumentNode.value.value;
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
            }
          });
        });
      }
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__owner') {
          const graphArgumentNode = directiveNode.arguments?.find(
            argumentNode => argumentNode.name.value === 'graph',
          );
          if (graphArgumentNode?.value?.kind === Kind.ENUM) {
            typeNameCanonicalMap.set(node.name.value, graphArgumentNode.value.value);
          }
        }
        if (directiveNode.name.value === 'join__type') {
          const graphArgumentNode = directiveNode.arguments?.find(
            argumentNode => argumentNode.name.value === 'graph',
          );
          if (graphArgumentNode?.value?.kind === Kind.ENUM) {
            let keyFieldName: string;
            const graphName = graphArgumentNode.value.value;
            const keyArgumentNode = directiveNode.arguments?.find(
              argumentNode => argumentNode.name.value === 'key',
            );
            if (keyArgumentNode?.value?.kind === Kind.STRING) {
              let typeNameKeyMap = typeNameKeyBySubgraphMap.get(graphName);
              if (!typeNameKeyMap) {
                typeNameKeyMap = new Map();
                typeNameKeyBySubgraphMap.set(graphName, typeNameKeyMap);
              }
              keyFieldName = keyArgumentNode.value.value;
              typeNameKeyMap.set(node.name.value, keyFieldName);
            }
            const fieldDefinitionNodesOfSubgraph: FieldDefinitionNode[] = [];
            node.fields?.forEach(fieldNode => {
              if (fieldNode.name.value === keyFieldName) {
                fieldDefinitionNodesOfSubgraph.push({
                  ...fieldNode,
                  directives: fieldNode.directives?.filter(
                    directiveNode => directiveNode.name.value !== 'join__field',
                  ),
                });
                return;
              }
              const joinFieldDirectiveNode = fieldNode.directives?.find(
                directiveNode => directiveNode.name.value === 'join__field',
              );
              if (joinFieldDirectiveNode) {
                const graphArgumentNode = joinFieldDirectiveNode.arguments?.find(
                  argumentNode => argumentNode.name.value === 'graph',
                );
                if (graphArgumentNode?.value?.kind === Kind.ENUM) {
                  if (graphArgumentNode.value.value === graphName) {
                    const requiresArgumentNode = joinFieldDirectiveNode.arguments?.find(
                      argumentNode => argumentNode.name.value === 'requires',
                    );
                    if (requiresArgumentNode?.value?.kind === Kind.STRING) {
                      let typeNameFieldsKeyMap = typeNameFieldsKeyBySubgraphMap.get(graphName);
                      if (!typeNameFieldsKeyMap) {
                        typeNameFieldsKeyMap = new Map();
                        typeNameFieldsKeyBySubgraphMap.set(graphName, typeNameFieldsKeyMap);
                      }
                      let fieldsKeyMap = typeNameFieldsKeyMap.get(node.name.value);
                      if (!fieldsKeyMap) {
                        fieldsKeyMap = new Map();
                        typeNameFieldsKeyMap.set(node.name.value, fieldsKeyMap);
                      }
                      fieldsKeyMap.set(fieldNode.name.value, requiresArgumentNode.value.value);
                    }
                    fieldDefinitionNodesOfSubgraph.push({
                      ...fieldNode,
                      directives: fieldNode.directives?.filter(
                        directiveNode => directiveNode.name.value !== 'join__field',
                      ),
                    });
                  }
                }
              } else {
                fieldDefinitionNodesOfSubgraph.push({
                  ...fieldNode,
                  directives: fieldNode.directives?.filter(
                    directiveNode => directiveNode.name.value !== 'join__field',
                  ),
                });
              }
            });
            const objectTypedDefNodeForSubgraph: ObjectTypeDefinitionNode = {
              ...node,
              fields: fieldDefinitionNodesOfSubgraph,
              directives: node.directives?.filter(
                directiveNode =>
                  directiveNode.name.value !== 'join__type' &&
                  directiveNode.name.value !== 'join__owner',
              ),
            };
            let subgraphTypeMap = subgraphTypesMap.get(graphName);
            if (!subgraphTypeMap) {
              subgraphTypeMap = new Map();
              subgraphTypesMap.set(graphName, subgraphTypeMap);
            }
            subgraphTypeMap.set(
              objectTypedDefNodeForSubgraph.name.value,
              objectTypedDefNodeForSubgraph,
            );
          }
        }
      });
    },
  });
  const subschemaMap = new Map<string, SubschemaConfig>();
  for (const [subgraphName, endpoint] of subgraphEndpointMap) {
    const executor = onExecutor({ subgraphName, endpoint });
    const mergeConfig: SubschemaConfig['merge'] = {};
    const typeNameKeyMap = typeNameKeyBySubgraphMap.get(subgraphName);
    const unionTypeNodes: NamedTypeNode[] = [];
    if (typeNameKeyMap) {
      const typeNameFieldsKeyMap = typeNameFieldsKeyBySubgraphMap.get(subgraphName);
      for (const [typeName, key] of typeNameKeyMap) {
        const mergedTypeConfig: MergedTypeConfig = (mergeConfig[typeName] = {
          selectionSet: `{ ${key} }`,
          argsFromKeys: getArgsFromKeysForFederation,
          key: getKeyForFederation,
          fieldName: `_entities`,
        });
        const keyProps = key.split(' ');
        mergedTypeConfig.dataLoaderOptions = {
          cacheKeyFn(root) {
            return keyProps.map(key => root[key]).join(' ');
          },
        };
        const fieldsKeyMap = typeNameFieldsKeyMap?.get(typeName);
        if (fieldsKeyMap) {
          const fieldsConfig = (mergedTypeConfig.fields = {});
          for (const [fieldName, key] of fieldsKeyMap) {
            fieldsConfig[fieldName] = {
              selectionSet: `{ ${key} }`,
              computed: true,
            };
          }
        }
        if (typeNameCanonicalMap.get(typeName) === subgraphName) {
          mergedTypeConfig.canonical = true;
        }
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
    const subgraphTypeMap = subgraphTypesMap.get(subgraphName) || new Map();
    const initialSubgraphTypes = [...subgraphTypeMap.values()];
    for (const typeDefinitionNode of initialSubgraphTypes) {
      processDependencies(typeDefinitionNode, typeMap, subgraphTypeMap);
    }
    const schema = buildASTSchema(
      {
        kind: Kind.DOCUMENT,
        definitions: [
          ...subgraphTypeMap.values(),
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
