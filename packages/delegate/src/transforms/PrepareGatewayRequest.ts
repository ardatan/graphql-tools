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
  GraphQLResolveInfo,
  InlineFragmentNode,
} from 'graphql';

import { implementsAbstractType, ExecutionRequest } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';
import { memoize2 } from '../memoize';

export default class PrepareGatewayRequest implements Transform {
  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionRequest {
    const { transformedSchema, info } = delegationContext;
    if (info) {
      return {
        ...originalRequest,
        document: prepareGatewayDocument(info, transformedSchema, originalRequest.document),
      };
    }

    return originalRequest;
  }
}

function prepareGatewayDocument(
  info: GraphQLResolveInfo,
  targetSchema: GraphQLSchema,
  originalDocument: DocumentNode
): DocumentNode {
  const { possibleTypesMap, reversePossibleTypesMap, interfaceExtensionsMap } = getSchemaMetaData(
    info.schema,
    targetSchema
  );

  const { operations, fragments, fragmentNames } = getDocumentMetadata(originalDocument);

  const { expandedFragments, fragmentReplacements } = getExpandedFragments(fragments, fragmentNames, possibleTypesMap);

  const typeInfo = new TypeInfo(targetSchema);

  const expandedDocument = {
    kind: Kind.DOCUMENT,
    definitions: [...operations, ...fragments, ...expandedFragments],
  };

  return visit(
    expandedDocument,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET]: node =>
        visitSelectionSet(
          node,
          fragmentReplacements,
          targetSchema,
          typeInfo,
          possibleTypesMap,
          reversePossibleTypesMap,
          interfaceExtensionsMap
        ),
    })
  );
}

function visitSelectionSet(
  node: SelectionSetNode,
  fragmentReplacements: Record<string, Array<{ fragmentName: string; typeName: string }>>,
  targetSchema: GraphQLSchema,
  typeInfo: TypeInfo,
  possibleTypesMap: Record<string, Array<string>>,
  reversePossibleTypesMap: Record<string, Array<string>>,
  interfaceExtensionsMap: Record<string, Record<string, boolean>>
): SelectionSetNode {
  const newSelections: Array<SelectionNode> = [];
  const maybeType = typeInfo.getParentType();

  if (maybeType != null) {
    const parentType: GraphQLNamedType = getNamedType(maybeType);
    const interfaceExtension = interfaceExtensionsMap[parentType.name];
    const interfaceExtensionFields = [] as Array<SelectionNode>;

    for (const selection of node.selections) {
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        if (selection.typeCondition != null) {
          const possibleTypes = possibleTypesMap[selection.typeCondition.name.value];

          if (possibleTypes == null) {
            newSelections.push(selection);
            continue;
          }

          for (const possibleTypeName of possibleTypes) {
            const maybePossibleType = targetSchema.getType(possibleTypeName);
            if (maybePossibleType != null && implementsAbstractType(targetSchema, parentType, maybePossibleType)) {
              newSelections.push(generateInlineFragment(possibleTypeName, selection.selectionSet));
            }
          }
        }
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const fragmentName = selection.name.value;

        if (!(fragmentName in fragmentReplacements)) {
          newSelections.push(selection);
          continue;
        }

        for (const replacement of fragmentReplacements[fragmentName]) {
          const typeName = replacement.typeName;
          const maybeReplacementType = targetSchema.getType(typeName);

          if (maybeReplacementType != null && implementsAbstractType(targetSchema, parentType, maybeType)) {
            newSelections.push({
              kind: Kind.FRAGMENT_SPREAD,
              name: {
                kind: Kind.NAME,
                value: replacement.fragmentName,
              },
            });
          }
        }
      } else if (
        interfaceExtension != null &&
        interfaceExtension[selection.name.value] &&
        selection.kind === Kind.FIELD
      ) {
        interfaceExtensionFields.push(selection);
      } else {
        newSelections.push(selection);
      }
    }

    if (parentType.name in reversePossibleTypesMap) {
      newSelections.push({
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
          newSelections.push(
            generateInlineFragment(possibleType, {
              kind: Kind.SELECTION_SET,
              selections: interfaceExtensionFields,
            })
          );
        }
      }
    }

    return {
      ...node,
      selections: newSelections,
    };
  }

  return node;
}

function generateInlineFragment(typeName: string, selectionSet: SelectionSetNode): InlineFragmentNode {
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
    targetSchema: GraphQLSchema
  ): {
    possibleTypesMap: Record<string, Array<string>>;
    reversePossibleTypesMap: Record<string, Array<string>>;
    interfaceExtensionsMap: Record<string, Record<string, boolean>>;
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

        if (!isAbstractType(targetType) || typeName in interfaceExtensionsMap) {
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
    return {
      possibleTypesMap,
      reversePossibleTypesMap: reversePossibleTypesMap(possibleTypesMap),
      interfaceExtensionsMap,
    };
  }
);

function reversePossibleTypesMap(possibleTypesMap: Record<string, Array<string>>): Record<string, Array<string>> {
  const result: Record<string, Array<string>> = Object.create(null);
  for (const typeName in possibleTypesMap) {
    const toTypeNames = possibleTypesMap[typeName];
    for (const toTypeName of toTypeNames) {
      if (!(toTypeName in result)) {
        result[toTypeName] = [];
      }
      result[toTypeName].push(typeName);
    }
  }
  return result;
}

function getDocumentMetadata(document: DocumentNode): {
  operations: Array<OperationDefinitionNode>;
  fragments: Array<FragmentDefinitionNode>;
  fragmentNames: Set<string>;
} {
  const operations: OperationDefinitionNode[] = [];
  const fragments: FragmentDefinitionNode[] = [];
  const fragmentNames = new Set<string>();
  for (let i = 0; i < document.definitions.length; i++) {
    const def = document.definitions[i];

    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.push(def);
      fragmentNames.add(def.name.value);
    } else if (def.kind === Kind.OPERATION_DEFINITION) {
      operations.push(def);
    }
  }

  return {
    operations,
    fragments,
    fragmentNames,
  };
}

function getExpandedFragments(
  fragments: Array<FragmentDefinitionNode>,
  fragmentNames: Set<string>,
  possibleTypesMap: Record<string, Array<string>>
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
  const fragmentReplacements: Record<string, Array<{ fragmentName: string; typeName: string }>> = Object.create(null);
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
