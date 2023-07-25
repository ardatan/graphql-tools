import {
  buildASTSchema,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  GraphQLSchema,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  parse,
  ScalarTypeDefinitionNode,
  TypeDefinitionNode,
  UnionTypeDefinitionNode,
  visit,
} from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { stitchSchemas } from '@graphql-tools/stitch';
import type { Executor } from '@graphql-tools/utils';
import { FilterRootFields, FilterTypes } from '@graphql-tools/wrap';
import {
  filterInternalFieldsAndTypes,
  getArgsFromKeysForFederation,
  getKeyForFederation,
} from './utils.js';

export interface GetSubschemasFromSupergraphSdlOpts {
  supergraphSdl: string | DocumentNode;
  onExecutor?: (opts: { subgraphName: string; endpoint: string }) => Executor;
}

export function getSubschemasFromSupergraphSdl({
  supergraphSdl,
  onExecutor = ({ endpoint }) => buildHTTPExecutor({ endpoint }),
}: GetSubschemasFromSupergraphSdlOpts) {
  const ast = typeof supergraphSdl === 'string' ? parse(supergraphSdl) : supergraphSdl;
  const subgraphQueryFieldDefinitionNodes = new Map<string, FieldDefinitionNode[]>();
  const subgraphEndpointMap = new Map<string, string>();
  const subgraphTypesMap = new Map<string, TypeDefinitionNode[]>();
  const typeNameKeyBySubgraphMap = new Map<string, Map<string, string>>();
  const typeNameFieldsKeyBySubgraphMap = new Map<string, Map<string, Map<string, string>>>();
  const typeNameCanonicalMap = new Map<string, string>();
  visit(ast, {
    EnumTypeDefinition(node) {
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
            let subgraphTypes = subgraphTypesMap.get(graphName);
            if (!subgraphTypes) {
              subgraphTypes = [];
              subgraphTypesMap.set(graphName, subgraphTypes);
            }
            subgraphTypes.push(enumTypedDefNodeForSubgraph);
          }
        }
      });
    },
    ObjectTypeDefinition(node) {
      if (node.name.value === 'Query') {
        node.fields?.forEach(fieldNode => {
          fieldNode.directives?.forEach(directiveNode => {
            if (directiveNode.name.value === 'join__field') {
              const graphArgumentNode = directiveNode.arguments?.find(
                argumentNode => argumentNode.name.value === 'graph',
              );
              if (graphArgumentNode?.value?.kind === Kind.ENUM) {
                const graphName = graphArgumentNode.value.value;
                let fieldDefinitionNodesOfSubgraph =
                  subgraphQueryFieldDefinitionNodes.get(graphName);
                if (!fieldDefinitionNodesOfSubgraph) {
                  fieldDefinitionNodesOfSubgraph = [];
                  subgraphQueryFieldDefinitionNodes.set(graphName, fieldDefinitionNodesOfSubgraph);
                }
                fieldDefinitionNodesOfSubgraph.push(fieldNode);
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
            const fieldDefinitionNodesOfSubgraph =
              node.fields?.filter(fieldNode => {
                if (fieldNode.name.value === keyFieldName) {
                  return true;
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
                      return true;
                    }
                  }
                } else {
                  return true;
                }
                return false;
              }) || [];
            const objectTypedDefNodeForSubgraph: ObjectTypeDefinitionNode = {
              ...node,
              fields: fieldDefinitionNodesOfSubgraph,
            };
            let subgraphTypes = subgraphTypesMap.get(graphName);
            if (!subgraphTypes) {
              subgraphTypes = [];
              subgraphTypesMap.set(graphName, subgraphTypes);
            }
            subgraphTypes.push(objectTypedDefNodeForSubgraph);
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
        const fieldsKeyMap = typeNameFieldsKeyMap?.get(typeName);
        const fieldsConfig = {};
        if (fieldsKeyMap) {
          for (const [fieldName, key] of fieldsKeyMap) {
            fieldsConfig[fieldName] = {
              selectionSet: `{ ${key} }`,
              computed: true,
            };
          }
        }
        mergeConfig[typeName] = {
          selectionSet: `{ ${key} }`,
          key: getKeyForFederation,
          argsFromKeys: getArgsFromKeysForFederation,
          fieldName: `_entities`,
          fields: fieldsConfig,
          canonical: typeNameCanonicalMap.get(typeName) === subgraphName,
        };
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
    const queryFields = subgraphQueryFieldDefinitionNodes.get(subgraphName) || [];
    const queryWithEntitiesFieldDefinitionNode: ObjectTypeDefinitionNode = {
      name: {
        kind: Kind.NAME,
        value: 'Query',
      },
      kind: Kind.OBJECT_TYPE_DEFINITION,
      fields: [
        ...queryFields,
        {
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
        },
      ],
    };
    const schema = buildASTSchema(
      {
        kind: Kind.DOCUMENT,
        definitions: [
          ...(subgraphTypesMap.get(subgraphName) || []),
          entitiesUnionTypeDefinitionNode,
          anyTypeDefinitionNode,
          queryWithEntitiesFieldDefinitionNode,
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
    });
  }
  return subschemaMap;
}

export function getStitchedSchemaFromSupergraphSdl(opts: GetSubschemasFromSupergraphSdlOpts) {
  const subschemaMap = getSubschemasFromSupergraphSdl(opts);
  const supergraphSchema = stitchSchemas({
    subschemas: [...subschemaMap.values()],
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
