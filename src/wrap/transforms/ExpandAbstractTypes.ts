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
  visit,
  visitWithTypeInfo,
} from 'graphql';

import implementsAbstractType from '../../utils/implementsAbstractType';
import { Transform, Request } from '../../Interfaces';

type TypeMapping = { [key: string]: Array<string> };

export default class ExpandAbstractTypes implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly mapping: TypeMapping;
  private readonly reverseMapping: TypeMapping;

  constructor(sourceSchema: GraphQLSchema, targetSchema: GraphQLSchema) {
    this.targetSchema = targetSchema;
    this.mapping = extractPossibleTypes(sourceSchema, targetSchema);
    this.reverseMapping = flipMapping(this.mapping);
  }

  public transformRequest(originalRequest: Request): Request {
    const document = expandAbstractTypes(
      this.targetSchema,
      this.mapping,
      this.reverseMapping,
      originalRequest.document,
    );
    return {
      ...originalRequest,
      document,
    };
  }
}

function extractPossibleTypes(
  sourceSchema: GraphQLSchema,
  targetSchema: GraphQLSchema,
) {
  const typeMap = sourceSchema.getTypeMap();
  const mapping: TypeMapping = {};
  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];
    if (isAbstractType(type)) {
      const targetType = targetSchema.getType(typeName);
      if (!isAbstractType(targetType)) {
        const implementations = sourceSchema.getPossibleTypes(type);
        mapping[typeName] = implementations
          .filter(impl => targetSchema.getType(impl.name))
          .map(impl => impl.name);
      }
    }
  });
  return mapping;
}

function flipMapping(mapping: TypeMapping): TypeMapping {
  const result: TypeMapping = {};
  Object.keys(mapping).forEach(typeName => {
    const toTypeNames = mapping[typeName];
    toTypeNames.forEach(toTypeName => {
      if (result[toTypeName] == null) {
        result[toTypeName] = [];
      }
      result[toTypeName].push(typeName);
    });
  });
  return result;
}

function expandAbstractTypes(
  targetSchema: GraphQLSchema,
  mapping: TypeMapping,
  reverseMapping: TypeMapping,
  document: DocumentNode,
): DocumentNode {
  const operations: Array<OperationDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.OPERATION_DEFINITION,
  ) as Array<OperationDefinitionNode>;
  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.FRAGMENT_DEFINITION,
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

  const newFragments: Array<FragmentDefinitionNode> = [];
  const fragmentReplacements: {
    [fragmentName: string]: Array<{ fragmentName: string; typeName: string }>;
  } = {};

  fragments.forEach((fragment: FragmentDefinitionNode) => {
    newFragments.push(fragment);
    const possibleTypes = mapping[fragment.typeCondition.name.value];
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
        const newSelections = [...node.selections];
        const maybeType = typeInfo.getParentType();
        if (maybeType != null) {
          const parentType: GraphQLNamedType = getNamedType(maybeType);
          node.selections.forEach((selection: SelectionNode) => {
            if (selection.kind === Kind.INLINE_FRAGMENT) {
              if (selection.typeCondition != null) {
                const possibleTypes =
                  mapping[selection.typeCondition.name.value];
                if (possibleTypes != null) {
                  possibleTypes.forEach(possibleType => {
                    const maybePossibleType = targetSchema.getType(
                      possibleType,
                    );
                    if (
                      maybePossibleType != null &&
                      implementsAbstractType(
                        targetSchema,
                        parentType,
                        maybePossibleType,
                      )
                    ) {
                      newSelections.push({
                        kind: Kind.INLINE_FRAGMENT,
                        typeCondition: {
                          kind: Kind.NAMED_TYPE,
                          name: {
                            kind: Kind.NAME,
                            value: possibleType,
                          },
                        },
                        selectionSet: selection.selectionSet,
                      });
                    }
                  });
                }
              }
            } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
              const fragmentName = selection.name.value;
              const replacements = fragmentReplacements[fragmentName];
              if (replacements != null) {
                replacements.forEach(replacement => {
                  const typeName = replacement.typeName;
                  const maybeReplacementType = targetSchema.getType(typeName);
                  if (
                    maybeReplacementType != null &&
                    implementsAbstractType(targetSchema, parentType, maybeType)
                  ) {
                    newSelections.push({
                      kind: Kind.FRAGMENT_SPREAD,
                      name: {
                        kind: Kind.NAME,
                        value: replacement.fragmentName,
                      },
                    });
                  }
                });
              }
            }
          });

          if (reverseMapping[parentType.name] != null) {
            newSelections.push({
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: '__typename',
              },
            });
          }
        }

        if (newSelections.length !== node.selections.length) {
          return {
            ...node,
            selections: newSelections,
          };
        }
      },
    }),
  );
}
