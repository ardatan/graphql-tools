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
import implementsAbstractType from '../implementsAbstractType';
import { Transform, Request } from '../Interfaces';

type TypeMapping = { [key: string]: Array<string> };

export default class ExpandAbstractTypes implements Transform {
  private targetSchema: GraphQLSchema;
  private mapping: TypeMapping;
  private reverseMapping: TypeMapping;

  constructor(transformedSchema: GraphQLSchema, targetSchema: GraphQLSchema) {
    this.targetSchema = targetSchema;
    this.mapping = extractPossibleTypes(transformedSchema, targetSchema);
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
  transformedSchema: GraphQLSchema,
  targetSchema: GraphQLSchema,
) {
  const typeMap = transformedSchema.getTypeMap();
  const mapping: TypeMapping = {};
  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];
    if (isAbstractType(type)) {
      const targetType = targetSchema.getType(typeName);
      if (!isAbstractType(targetType)) {
        const implementations = transformedSchema.getPossibleTypes(type) || [];
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
      if (!result[toTypeName]) {
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
  const operations: Array<
    OperationDefinitionNode
  > = document.definitions.filter(
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
      fragmentName = `_${typeName}_Fragment${fragmentCounter}`;
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
    if (possibleTypes) {
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
        const parentType: GraphQLNamedType = getNamedType(
          typeInfo.getParentType(),
        );
        node.selections.forEach((selection: SelectionNode) => {
          if (selection.kind === Kind.INLINE_FRAGMENT) {
            const possibleTypes = mapping[selection.typeCondition.name.value];
            if (possibleTypes) {
              possibleTypes.forEach(possibleType => {
                if (
                  implementsAbstractType(
                    targetSchema,
                    parentType,
                    targetSchema.getType(possibleType),
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
          } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
            const fragmentName = selection.name.value;
            const replacements = fragmentReplacements[fragmentName];
            if (replacements) {
              replacements.forEach(replacement => {
                const typeName = replacement.typeName;
                if (
                  implementsAbstractType(
                    targetSchema,
                    parentType,
                    targetSchema.getType(typeName),
                  )
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

        if (parentType && reverseMapping[parentType.name]) {
          newSelections.push({
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          });
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
