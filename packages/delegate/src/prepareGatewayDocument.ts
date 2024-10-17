import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLNamedOutputType,
  GraphQLNamedType,
  GraphQLOutputType,
  GraphQLSchema,
  InlineFragmentNode,
  isAbstractType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  Kind,
  SelectionNode,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import {
  ASTVisitorKeyMap,
  getRootTypeNames,
  implementsAbstractType,
  memoize2,
} from '@graphql-tools/utils';
import { extractUnavailableFields } from './extractUnavailableFields.js';
import { getDocumentMetadata } from './getDocumentMetadata.js';
import { StitchingInfo } from './types.js';

export function prepareGatewayDocument(
  originalDocument: DocumentNode,
  transformedSchema: GraphQLSchema,
  returnType: GraphQLOutputType,
  infoSchema?: GraphQLSchema,
): DocumentNode {
  const wrappedConcreteTypesDocument = wrapConcreteTypes(
    returnType,
    transformedSchema,
    originalDocument,
  );

  if (infoSchema == null) {
    return wrappedConcreteTypesDocument;
  }

  const visitedSelections = new WeakSet<SelectionNode>();

  const {
    possibleTypesMap,
    reversePossibleTypesMap,
    interfaceExtensionsMap,
    fieldNodesByType,
    fieldNodesByField,
    dynamicSelectionSetsByField,
  } = getSchemaMetaData(infoSchema, transformedSchema);

  const { operations, fragments, fragmentNames } = getDocumentMetadata(
    wrappedConcreteTypesDocument,
  );

  const { expandedFragments, fragmentReplacements } = getExpandedFragments(
    fragments,
    fragmentNames,
    possibleTypesMap,
  );

  const typeInfo = new TypeInfo(transformedSchema);

  const expandedDocument: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [...operations, ...fragments, ...expandedFragments],
  };

  const visitorKeyMap: ASTVisitorKeyMap = {
    Document: ['definitions'],
    OperationDefinition: ['selectionSet'],
    SelectionSet: ['selections'],
    Field: ['selectionSet'],
    InlineFragment: ['selectionSet'],
    FragmentDefinition: ['selectionSet'],
  };

  return visit(
    expandedDocument,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET]: node =>
        visitSelectionSet(
          node,
          fragmentReplacements,
          transformedSchema,
          typeInfo,
          possibleTypesMap,
          reversePossibleTypesMap,
          interfaceExtensionsMap,
          fieldNodesByType,
          fieldNodesByField,
          dynamicSelectionSetsByField,
          infoSchema,
          visitedSelections,
        ),
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    visitorKeyMap as any,
  );
}

const shouldAdd = () => true;

function visitSelectionSet(
  node: SelectionSetNode,
  fragmentReplacements: Record<string, Array<{ fragmentName: string; typeName: string }>>,
  transformedSchema: GraphQLSchema,
  typeInfo: TypeInfo,
  possibleTypesMap: Record<string, Array<string>>,
  reversePossibleTypesMap: Record<string, Array<string>>,
  interfaceExtensionsMap: Record<string, Record<string, boolean>>,
  fieldNodesByType: Record<string, Array<FieldNode>>,
  fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>,
  dynamicSelectionSetsByField: Record<
    string,
    Record<string, Array<(node: FieldNode) => SelectionSetNode>>
  >,
  // TODO: Refactor here later for Federation compat
  infoSchema: GraphQLSchema,
  visitedSelections: WeakSet<SelectionNode>,
): SelectionSetNode {
  const newSelections = new Set<SelectionNode>();
  const maybeType = typeInfo.getParentType();
  if (maybeType != null) {
    const parentType: GraphQLNamedType = getNamedType(maybeType);
    const parentTypeName = parentType.name;

    const fieldNodes = fieldNodesByType[parentTypeName];
    if (fieldNodes) {
      for (const fieldNode of fieldNodes) {
        newSelections.add(fieldNode);
      }
    }

    const interfaceExtensions = interfaceExtensionsMap[parentType.name];
    const interfaceExtensionFields: Array<SelectionNode> = [];

    for (const selection of node.selections) {
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        if (selection.typeCondition != null) {
          // TODO: Refactor here later for Federation compat
          if (!visitedSelections.has(selection)) {
            visitedSelections.add(selection);
            const typeName = selection.typeCondition!.name.value;
            const gatewayType = infoSchema.getType(typeName);
            const subschemaType = transformedSchema.getType(typeName);
            if (isAbstractType(gatewayType) && isAbstractType(subschemaType)) {
              const possibleTypes = infoSchema.getPossibleTypes(gatewayType);
              const possibleTypesInSubschema = transformedSchema.getPossibleTypes(subschemaType);
              const extraTypesForSubschema = new Set<string>();
              for (const possibleType of possibleTypes) {
                const possibleTypeInSubschema = transformedSchema.getType(possibleType.name);
                // If it doesn't exist in the subschema
                if (!possibleTypeInSubschema) {
                  continue;
                }
                // If it is a possible type in the gateway schema, it should be a possible type in the subschema
                if (
                  possibleTypeInSubschema &&
                  possibleTypesInSubschema.some(t => t.name === possibleType.name)
                ) {
                  continue;
                }
                // If it exists in the subschema but it is not a possible type
                if (!extraTypesForSubschema.has(possibleType.name)) {
                  extraTypesForSubschema.add(possibleType.name);
                  newSelections.add({
                    ...selection,
                    typeCondition: {
                      kind: Kind.NAMED_TYPE,
                      name: {
                        kind: Kind.NAME,
                        value: possibleType.name,
                      },
                    },
                  });
                }
              }
            }
            const typeInSubschema = transformedSchema.getType(typeName);
            if (isObjectType(typeInSubschema) || isInterfaceType(typeInSubschema)) {
              const fieldMap = typeInSubschema.getFields();
              for (const subSelection of selection.selectionSet.selections) {
                if (subSelection.kind === Kind.FIELD) {
                  const fieldName = subSelection.name.value;
                  const field = fieldMap[fieldName];
                  if (!field) {
                    newSelections.add(subSelection);
                  }
                }
              }
            } else if (!typeInSubschema) {
              for (const subSelection of selection.selectionSet.selections) {
                newSelections.add(subSelection);
              }
            }
          }

          const possibleTypes = possibleTypesMap[selection.typeCondition.name.value];

          if (possibleTypes == null) {
            const fieldNodesForTypeName = fieldNodesByField[parentTypeName]?.['__typename'];
            if (fieldNodesForTypeName) {
              for (const fieldNode of fieldNodesForTypeName) {
                newSelections.add(fieldNode);
              }
            }
            newSelections.add(selection);
            continue;
          }

          for (const possibleTypeName of possibleTypes) {
            const maybePossibleType = transformedSchema.getType(possibleTypeName);
            if (
              maybePossibleType != null &&
              implementsAbstractType(transformedSchema, parentType, maybePossibleType)
            ) {
              newSelections.add(generateInlineFragment(possibleTypeName, selection.selectionSet));
            }
          }

          if (possibleTypes.length === 0) {
            newSelections.add(selection);
          }
        } else {
          newSelections.add(selection);
        }
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const fragmentName = selection.name.value;

        if (!fragmentReplacements[fragmentName]) {
          newSelections.add(selection);
          continue;
        }

        for (const replacement of fragmentReplacements[fragmentName]) {
          const typeName = replacement.typeName;
          const maybeReplacementType = transformedSchema.getType(typeName);

          if (
            maybeReplacementType != null &&
            implementsAbstractType(transformedSchema, parentType, maybeType)
          ) {
            newSelections.add({
              kind: Kind.FRAGMENT_SPREAD,
              name: {
                kind: Kind.NAME,
                value: replacement.fragmentName,
              },
            });
          }
        }
      } else {
        const fieldName = selection.name.value;
        let skipAddingDependencyNodes = false;

        // TODO: Optimization to prevent extra fields to the subgraph
        if (isAbstractType(parentType)) {
          skipAddingDependencyNodes = false;
          const fieldNodesForTypeName = fieldNodesByField[parentTypeName]?.['__typename'];
          if (fieldNodesForTypeName) {
            for (const fieldNode of fieldNodesForTypeName) {
              newSelections.add(fieldNode);
            }
          }
        } else if (isObjectType(parentType) || isInterfaceType(parentType)) {
          const fieldMap = parentType.getFields();
          const field = fieldMap[fieldName];
          if (field) {
            const unavailableFields = extractUnavailableFields(
              transformedSchema,
              field,
              selection,
              shouldAdd,
            );
            skipAddingDependencyNodes = unavailableFields.length === 0;
          }
        }
        if (!skipAddingDependencyNodes) {
          const fieldNodesMapForType = fieldNodesByField[parentTypeName];
          if (fieldNodesMapForType) {
            addDependenciesNestedly(selection, new Set(), fieldNodesMapForType, newSelections);
          }

          const dynamicSelectionSets = dynamicSelectionSetsByField[parentTypeName]?.[fieldName];
          if (dynamicSelectionSets != null) {
            for (const selectionSetFn of dynamicSelectionSets) {
              const selectionSet = selectionSetFn(selection);
              if (selectionSet != null) {
                for (const selection of selectionSet.selections) {
                  newSelections.add(selection);
                }
              }
            }
          }
        }

        if (interfaceExtensions?.[fieldName]) {
          interfaceExtensionFields.push(selection);
        } else {
          newSelections.add(selection);
        }
      }
    }

    if (reversePossibleTypesMap[parentType.name]) {
      newSelections.add({
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      });
    }

    if (interfaceExtensionFields.length) {
      const possibleTypes = possibleTypesMap[parentType.name];
      if (possibleTypes != null) {
        for (const possibleType of possibleTypes) {
          newSelections.add(
            generateInlineFragment(possibleType, {
              kind: Kind.SELECTION_SET,
              selections: interfaceExtensionFields,
            }),
          );
        }
      }
    }

    return {
      ...node,
      selections: Array.from(newSelections),
    };
  }

  return node;
}

function addDependenciesNestedly(
  fieldNode: FieldNode,
  seenFieldNames: Set<string>,
  fieldNodesByField: Record<string, Array<FieldNode>>,
  newSelections: Set<SelectionNode>,
) {
  if (seenFieldNames.has(fieldNode.name.value)) {
    return;
  }
  seenFieldNames.add(fieldNode.name.value);
  const fieldNodes = fieldNodesByField[fieldNode.name.value];
  if (fieldNodes != null) {
    for (const nestedFieldNode of fieldNodes) {
      newSelections.add(nestedFieldNode);
      addDependenciesNestedly(nestedFieldNode, seenFieldNames, fieldNodesByField, newSelections);
    }
  }
}

function generateInlineFragment(
  typeName: string,
  selectionSet: SelectionSetNode,
): InlineFragmentNode {
  return {
    kind: Kind.INLINE_FRAGMENT,
    typeCondition: {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: typeName,
      },
    },
    selectionSet,
  };
}

const getSchemaMetaData = memoize2(
  (
    sourceSchema: GraphQLSchema,
    targetSchema: GraphQLSchema,
  ): {
    possibleTypesMap: Record<string, Array<string>>;
    reversePossibleTypesMap: Record<string, Array<string>>;
    interfaceExtensionsMap: Record<string, Record<string, boolean>>;
    fieldNodesByType: Record<string, Array<FieldNode>>;
    fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>;
    dynamicSelectionSetsByField: Record<
      string,
      Record<string, Array<(node: FieldNode) => SelectionSetNode>>
    >;
  } => {
    const typeMap = sourceSchema.getTypeMap();
    const targetTypeMap = targetSchema.getTypeMap();
    const possibleTypesMap: Record<string, Array<string>> = Object.create(null);
    const interfaceExtensionsMap: Record<string, Record<string, boolean>> = Object.create(null);

    for (const typeName in typeMap) {
      const type = typeMap[typeName];

      if (isAbstractType(type)) {
        const targetType = targetTypeMap[typeName];

        if (isInterfaceType(type) && isInterfaceType(targetType)) {
          const targetTypeFields = targetType.getFields();
          const sourceTypeFields = type.getFields();
          const extensionFields: Record<string, boolean> = Object.create(null);
          let isExtensionFieldsEmpty = true;

          for (const fieldName in sourceTypeFields) {
            if (!targetTypeFields[fieldName]) {
              extensionFields[fieldName] = true;
              isExtensionFieldsEmpty = false;
            }
          }

          if (!isExtensionFieldsEmpty) {
            interfaceExtensionsMap[typeName] = extensionFields;
          }
        }

        if (interfaceExtensionsMap[typeName] || !isAbstractType(targetType)) {
          const implementations = sourceSchema.getPossibleTypes(type);
          possibleTypesMap[typeName] = [];

          for (const impl of implementations) {
            if (targetTypeMap[impl.name]) {
              possibleTypesMap[typeName].push(impl.name);
            }
          }
        }
      }
    }

    const stitchingInfo = sourceSchema.extensions?.['stitchingInfo'] as StitchingInfo;
    return {
      possibleTypesMap,
      reversePossibleTypesMap: reversePossibleTypesMap(possibleTypesMap),
      interfaceExtensionsMap,
      fieldNodesByType: stitchingInfo?.fieldNodesByType ?? {},
      fieldNodesByField: stitchingInfo?.fieldNodesByField ?? {},
      dynamicSelectionSetsByField: stitchingInfo?.dynamicSelectionSetsByField ?? {},
    };
  },
);

function reversePossibleTypesMap(
  possibleTypesMap: Record<string, Array<string>>,
): Record<string, Array<string>> {
  const result: Record<string, Array<string>> = Object.create(null);
  for (const typeName in possibleTypesMap) {
    const toTypeNames = possibleTypesMap[typeName];
    for (const toTypeName of toTypeNames) {
      if (!result[toTypeName]) {
        result[toTypeName] = [];
      }
      result[toTypeName].push(typeName);
    }
  }
  return result;
}

function getExpandedFragments(
  fragments: Array<FragmentDefinitionNode>,
  fragmentNames: Set<string>,
  possibleTypesMap: Record<string, Array<string>>,
): {
  expandedFragments: Array<FragmentDefinitionNode>;
  fragmentReplacements: Record<string, Array<{ fragmentName: string; typeName: string }>>;
} {
  let fragmentCounter = 0;
  function generateFragmentName(typeName: string): string {
    let fragmentName: string;

    do {
      fragmentName = `_${typeName}_Fragment${fragmentCounter.toString()}`;
      fragmentCounter++;
    } while (fragmentNames.has(fragmentName));

    return fragmentName;
  }

  const expandedFragments: Array<FragmentDefinitionNode> = [];
  const fragmentReplacements: Record<
    string,
    Array<{ fragmentName: string; typeName: string }>
  > = Object.create(null);
  for (const fragment of fragments) {
    const possibleTypes = possibleTypesMap[fragment.typeCondition.name.value];

    if (possibleTypes != null) {
      const fragmentName = fragment.name.value;
      fragmentReplacements[fragmentName] = [];
      for (const possibleTypeName of possibleTypes) {
        const name = generateFragmentName(possibleTypeName);
        fragmentNames.add(name);

        expandedFragments.push({
          kind: Kind.FRAGMENT_DEFINITION,
          name: {
            kind: Kind.NAME,
            value: name,
          },
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: possibleTypeName,
            },
          },
          selectionSet: fragment.selectionSet,
        });

        fragmentReplacements[fragmentName].push({
          fragmentName: name,
          typeName: possibleTypeName,
        });
      }
    }
  }

  return {
    expandedFragments,
    fragmentReplacements,
  };
}

function wrapConcreteTypes(
  returnType: GraphQLOutputType,
  targetSchema: GraphQLSchema,
  document: DocumentNode,
): DocumentNode {
  const namedType = getNamedType(returnType);

  if (isLeafType(namedType)) {
    return document;
  }

  let possibleTypes: readonly GraphQLNamedOutputType[] = isAbstractType(namedType)
    ? targetSchema.getPossibleTypes(namedType)
    : [namedType];

  if (possibleTypes.length === 0) {
    possibleTypes = [namedType];
  }

  const rootTypeNames = getRootTypeNames(targetSchema);

  const typeInfo = new TypeInfo(targetSchema);

  const visitorKeys: ASTVisitorKeyMap = {
    Document: ['definitions'],
    OperationDefinition: ['selectionSet'],
    SelectionSet: ['selections'],

    InlineFragment: ['selectionSet'],
    FragmentDefinition: ['selectionSet'],
  };

  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.FRAGMENT_DEFINITION]: (node: FragmentDefinitionNode) => {
        const typeName = node.typeCondition.name.value;
        if (!rootTypeNames.has(typeName)) {
          return false;
        }
      },
      [Kind.FIELD]: (node: FieldNode) => {
        const fieldType = typeInfo.getType();
        if (fieldType) {
          const fieldNamedType = getNamedType(fieldType);
          if (
            isAbstractType(fieldNamedType) &&
            fieldNamedType.name !== namedType.name &&
            possibleTypes.length > 0
          ) {
            return {
              ...node,
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: possibleTypes.map(possibleType => ({
                  kind: Kind.INLINE_FRAGMENT,
                  typeCondition: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: possibleType.name,
                    },
                  },
                  selectionSet: node.selectionSet,
                })),
              },
            };
          }
        }
      },
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    visitorKeys as any,
  );
}
