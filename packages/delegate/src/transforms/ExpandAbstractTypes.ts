import {
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLNamedType,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
  TypeInfo,
  getNamedType,
  isAbstractType,
  isInterfaceType,
  visit,
  visitWithTypeInfo,
} from 'graphql';

import { implementsAbstractType, Transform, Request } from '@graphql-tools/utils';

export default class ExpandAbstractTypes implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly possibleTypesMap: Record<string, Array<string>>;
  private readonly reversePossibleTypesMap: Record<string, Array<string>>;
  private readonly interfaceExtensionsMap: Record<string, Record<string, boolean>>;

  constructor(sourceSchema: GraphQLSchema, targetSchema: GraphQLSchema) {
    this.targetSchema = targetSchema;
    const { possibleTypesMap, interfaceExtensionsMap } = extractPossibleTypes(sourceSchema, targetSchema);
    this.possibleTypesMap = possibleTypesMap;
    this.reversePossibleTypesMap = flipMapping(this.possibleTypesMap);
    this.interfaceExtensionsMap = interfaceExtensionsMap;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = expandAbstractTypes(
      this.targetSchema,
      this.possibleTypesMap,
      this.reversePossibleTypesMap,
      this.interfaceExtensionsMap,
      originalRequest.document
    );

    return {
      ...originalRequest,
      document,
    };
  }
}

function extractPossibleTypes(sourceSchema: GraphQLSchema, targetSchema: GraphQLSchema) {
  const typeMap = sourceSchema.getTypeMap();
  const possibleTypesMap: Record<string, Array<string>> = Object.create(null);
  const interfaceExtensionsMap: Record<string, Record<string, boolean>> = Object.create(null);
  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];
    if (isAbstractType(type)) {
      const targetType = targetSchema.getType(typeName);

      if (isInterfaceType(type) && isInterfaceType(targetType)) {
        const targetTypeFields = targetType.getFields();
        const extensionFields: Record<string, boolean> = Object.create(null);
        Object.keys(type.getFields()).forEach((fieldName: string) => {
          if (!targetTypeFields[fieldName]) {
            extensionFields[fieldName] = true;
          }
        });
        if (Object.keys(extensionFields).length) {
          interfaceExtensionsMap[typeName] = extensionFields;
        }
      }

      if (!isAbstractType(targetType) || typeName in interfaceExtensionsMap) {
        const implementations = sourceSchema.getPossibleTypes(type);
        possibleTypesMap[typeName] = implementations
          .filter(impl => targetSchema.getType(impl.name))
          .map(impl => impl.name);
      }
    }
  });
  return { possibleTypesMap, interfaceExtensionsMap };
}

function flipMapping(mapping: Record<string, Array<string>>): Record<string, Array<string>> {
  const result: Record<string, Array<string>> = Object.create(null);
  Object.keys(mapping).forEach(typeName => {
    const toTypeNames = mapping[typeName];
    toTypeNames.forEach(toTypeName => {
      if (!(toTypeName in result)) {
        result[toTypeName] = [];
      }
      result[toTypeName].push(typeName);
    });
  });
  return result;
}

function expandAbstractTypes(
  targetSchema: GraphQLSchema,
  possibleTypesMap: Record<string, Array<string>>,
  reversePossibleTypesMap: Record<string, Array<string>>,
  interfaceExtensionsMap: Record<string, Record<string, boolean>>,
  document: DocumentNode
): DocumentNode {
  const operations: Array<OperationDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.OPERATION_DEFINITION
  ) as Array<OperationDefinitionNode>;

  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.FRAGMENT_DEFINITION
  ) as Array<FragmentDefinitionNode>;

  const existingFragmentNames = fragments.map(fragment => fragment.name.value);
  let fragmentCounter = 0;
  const generateFragmentName = (typeName: string) => {
    let fragmentName;
    do {
      fragmentName = `_${typeName}_Fragment${fragmentCounter.toString()}`;
      fragmentCounter++;
    } while (existingFragmentNames.indexOf(fragmentName) !== -1);
    return fragmentName;
  };
  const generateInlineFragment = (typeName: string, selectionSet: SelectionSetNode) => {
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
  };

  const newFragments: Array<FragmentDefinitionNode> = [];
  const fragmentReplacements: Record<string, Array<{ fragmentName: string; typeName: string }>> = Object.create(null);

  fragments.forEach((fragment: FragmentDefinitionNode) => {
    newFragments.push(fragment);
    const possibleTypes = possibleTypesMap[fragment.typeCondition.name.value];
    if (possibleTypes != null) {
      fragmentReplacements[fragment.name.value] = [];
      possibleTypes.forEach(possibleTypeName => {
        const name = generateFragmentName(possibleTypeName);
        existingFragmentNames.push(name);
        const newFragment: FragmentDefinitionNode = {
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
        };
        newFragments.push(newFragment);

        fragmentReplacements[fragment.name.value].push({
          fragmentName: name,
          typeName: possibleTypeName,
        });
      });
    }
  });

  const newDocument = {
    ...document,
    definitions: [...operations, ...newFragments],
  };
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    newDocument,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](node: SelectionSetNode) {
        let newSelections = node.selections;
        const addedSelections = [];
        const maybeType = typeInfo.getParentType();
        if (maybeType != null) {
          const parentType: GraphQLNamedType = getNamedType(maybeType);
          const interfaceExtension = interfaceExtensionsMap[parentType.name];
          const interfaceExtensionFields = [];
          node.selections.forEach((selection: SelectionNode) => {
            if (selection.kind === Kind.INLINE_FRAGMENT) {
              if (selection.typeCondition != null) {
                const possibleTypes = possibleTypesMap[selection.typeCondition.name.value];
                if (possibleTypes != null) {
                  possibleTypes.forEach(possibleType => {
                    const maybePossibleType = targetSchema.getType(possibleType);
                    if (
                      maybePossibleType != null &&
                      implementsAbstractType(targetSchema, parentType, maybePossibleType)
                    ) {
                      addedSelections.push(generateInlineFragment(possibleType, selection.selectionSet));
                    }
                  });
                }
              }
            } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
              const fragmentName = selection.name.value;
              if (fragmentName in fragmentReplacements) {
                fragmentReplacements[fragmentName].forEach(replacement => {
                  const typeName = replacement.typeName;
                  const maybeReplacementType = targetSchema.getType(typeName);
                  if (maybeReplacementType != null && implementsAbstractType(targetSchema, parentType, maybeType)) {
                    addedSelections.push({
                      kind: Kind.FRAGMENT_SPREAD,
                      name: {
                        kind: Kind.NAME,
                        value: replacement.fragmentName,
                      },
                    });
                  }
                });
              }
            } else if (
              interfaceExtension != null &&
              interfaceExtension[selection.name.value] &&
              selection.kind === Kind.FIELD
            ) {
              interfaceExtensionFields.push(selection);
            }
          });

          if (parentType.name in reversePossibleTypesMap) {
            addedSelections.push({
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
              possibleTypes.forEach(possibleType => {
                addedSelections.push(
                  generateInlineFragment(possibleType, {
                    kind: Kind.SELECTION_SET,
                    selections: interfaceExtensionFields,
                  })
                );
              });

              newSelections = newSelections.filter(
                (selection: SelectionNode) =>
                  !(selection.kind === Kind.FIELD && interfaceExtension[selection.name.value])
              );
            }
          }
        }

        if (addedSelections.length) {
          return {
            ...node,
            selections: newSelections.concat(addedSelections),
          };
        }
      },
    })
  );
}
