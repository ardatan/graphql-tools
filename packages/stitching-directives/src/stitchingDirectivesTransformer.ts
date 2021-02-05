import {
  getNamedType,
  getNullableType,
  GraphQLNamedType,
  GraphQLSchema,
  isInterfaceType,
  isListType,
  isObjectType,
  isUnionType,
  Kind,
  parseValue,
  print,
  SelectionNode,
  SelectionSetNode,
  valueFromASTUntyped,
} from 'graphql';

import { cloneSubschemaConfig, SubschemaConfig } from '@graphql-tools/delegate';
import {
  getDirectives,
  getImplementingTypes,
  MapperKind,
  mapSchema,
  mergeDeep,
  parseSelectionSet,
} from '@graphql-tools/utils';

import { KeyDeclaration, MergedTypeResolverInfo, StitchingDirectivesOptions } from './types';

import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { parseMergeArgsExpr } from './parseMergeArgsExpr';
import { addKey, getKey, getKeys, propertyTreeFromPaths } from './properties';
import { stitchingDirectivesValidator } from './stitchingDirectivesValidator';

export function stitchingDirectivesTransformer(
  options: StitchingDirectivesOptions = {}
): (subschemaConfig: SubschemaConfig) => SubschemaConfig {
  const {
    keyDirectiveName,
    computedDirectiveName,
    mergeDirectiveName,
    canonicalDirectiveName,
    pathToDirectivesInExtensions,
  } = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  return (subschemaConfig: SubschemaConfig): SubschemaConfig => {
    const newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);

    const selectionSetsByType: Record<string, SelectionSetNode> = Object.create(null);
    const computedFieldSelectionSets: Record<string, Record<string, SelectionSetNode>> = Object.create(null);
    const mergedTypesResolversInfo: Record<string, MergedTypeResolverInfo> = Object.create(null);
    const canonicalTypesInfo: Record<string, { canonical?: boolean; fields?: Record<string, boolean> }> = Object.create(
      null
    );

    const schema = subschemaConfig.schema;

    // gateway should also run validation
    stitchingDirectivesValidator(options)(schema);

    function setCanonicalDefinition(typeName: string, fieldName?: string): void {
      canonicalTypesInfo[typeName] = canonicalTypesInfo[typeName] || Object.create(null);
      if (fieldName) {
        canonicalTypesInfo[typeName].fields = canonicalTypesInfo[typeName].fields || Object.create(null);
        canonicalTypesInfo[typeName].fields[fieldName] = true;
      } else {
        canonicalTypesInfo[typeName].canonical = true;
      }
    }

    mapSchema(schema, {
      [MapperKind.OBJECT_TYPE]: type => {
        const directives = getDirectives(schema, type, pathToDirectivesInExtensions);

        const keyDirective = directives[keyDirectiveName];
        if (keyDirective) {
          const selectionSet = parseSelectionSet(keyDirective.selectionSet, { noLocation: true });
          selectionSetsByType[type.name] = selectionSet;
        }

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const directives = getDirectives(schema, fieldConfig, pathToDirectivesInExtensions);

        const computedDirective = directives[computedDirectiveName];
        if (computedDirective) {
          const selectionSet = parseSelectionSet(computedDirective.selectionSet, { noLocation: true });
          if (!computedFieldSelectionSets[typeName]) {
            computedFieldSelectionSets[typeName] = Object.create(null);
          }
          computedFieldSelectionSets[typeName][fieldName] = selectionSet;
        }

        const mergeDirectiveKeyField = directives[mergeDirectiveName]?.keyField;
        if (mergeDirectiveKeyField) {
          const selectionSet = parseSelectionSet(`{ ${mergeDirectiveKeyField}}`, { noLocation: true });

          const typeNames: Array<string> = directives[mergeDirectiveName]?.types;

          const returnType = getNamedType(fieldConfig.type);

          forEachConcreteType(schema, returnType, directives[mergeDirectiveName]?.types, typeName => {
            if (typeNames == null || typeNames.includes(typeName)) {
              const existingSelectionSet = selectionSetsByType[typeName];
              selectionSetsByType[typeName] = existingSelectionSet
                ? mergeSelectionSets(existingSelectionSet, selectionSet)
                : selectionSet;
            }
          });
        }

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(typeName, fieldName);
        }

        return undefined;
      },
      [MapperKind.INTERFACE_TYPE]: type => {
        const directives = getDirectives(schema, type, pathToDirectivesInExtensions);

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) => {
        const directives = getDirectives(schema, fieldConfig, pathToDirectivesInExtensions);

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(typeName, fieldName);
        }

        return undefined;
      },
      [MapperKind.INPUT_OBJECT_TYPE]: type => {
        const directives = getDirectives(schema, type, pathToDirectivesInExtensions);

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.INPUT_OBJECT_FIELD]: (inputFieldConfig, fieldName, typeName) => {
        const directives = getDirectives(schema, inputFieldConfig, pathToDirectivesInExtensions);

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(typeName, fieldName);
        }

        return undefined;
      },
      [MapperKind.UNION_TYPE]: type => {
        const directives = getDirectives(schema, type, pathToDirectivesInExtensions);

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.ENUM_TYPE]: type => {
        const directives = getDirectives(schema, type, pathToDirectivesInExtensions);

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
      [MapperKind.SCALAR_TYPE]: type => {
        const directives = getDirectives(schema, type, pathToDirectivesInExtensions);

        if (directives[canonicalDirectiveName]) {
          setCanonicalDefinition(type.name);
        }

        return undefined;
      },
    });

    if (subschemaConfig.merge) {
      Object.entries(subschemaConfig.merge).forEach(([typeName, mergedTypeConfig]) => {
        if (mergedTypeConfig.selectionSet) {
          const selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet, { noLocation: true });
          if (selectionSet) {
            if (selectionSetsByType[typeName]) {
              selectionSetsByType[typeName] = mergeSelectionSets(selectionSetsByType[typeName], selectionSet);
            } else {
              selectionSetsByType[typeName] = selectionSet;
            }
          }
        }
        if (mergedTypeConfig.fields) {
          Object.entries(mergedTypeConfig.fields).forEach(([fieldName, fieldConfig]) => {
            if (!fieldConfig.selectionSet) return;

            const selectionSet = parseSelectionSet(fieldConfig.selectionSet, { noLocation: true });
            if (selectionSet) {
              if (computedFieldSelectionSets[typeName]?.[fieldName]) {
                computedFieldSelectionSets[typeName][fieldName] = mergeSelectionSets(
                  computedFieldSelectionSets[typeName][fieldName],
                  selectionSet
                );
              } else {
                if (computedFieldSelectionSets[typeName] == null) {
                  computedFieldSelectionSets[typeName] = Object.create(null);
                }
                computedFieldSelectionSets[typeName][fieldName] = selectionSet;
              }
            }
          });
        }
      });
    }

    const allSelectionSetsByType: Record<string, Array<SelectionSetNode>> = Object.create(null);

    Object.entries(selectionSetsByType).forEach(([typeName, selectionSet]) => {
      if (allSelectionSetsByType[typeName] == null) {
        allSelectionSetsByType[typeName] = [selectionSet];
      } else {
        allSelectionSetsByType[typeName].push(selectionSet);
      }
    });

    Object.entries(computedFieldSelectionSets).forEach(([typeName, selectionSets]) => {
      Object.values(selectionSets).forEach(selectionSet => {
        if (allSelectionSetsByType[typeName] == null) {
          allSelectionSetsByType[typeName] = [selectionSet];
        } else {
          allSelectionSetsByType[typeName].push(selectionSet);
        }
      });
    });

    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
        const directives = getDirectives(schema, fieldConfig, pathToDirectivesInExtensions);

        if (directives[mergeDirectiveName]) {
          const directiveArgumentMap = directives[mergeDirectiveName];

          const returnType = getNullableType(fieldConfig.type);
          const returnsList = isListType(returnType);
          const namedType = getNamedType(returnType);

          let mergeArgsExpr: string = directiveArgumentMap.argsExpr;

          if (mergeArgsExpr == null) {
            const key: Array<string> = directiveArgumentMap.key;
            const keyField: string = directiveArgumentMap.keyField;
            const keyExpr = key != null ? buildKey(key) : keyField != null ? `$key.${keyField}` : '$key';

            const keyArg: string = directiveArgumentMap.keyArg;
            const argNames = keyArg == null ? [Object.keys(fieldConfig.args)[0]] : keyArg.split('.');

            const lastArgName = argNames.pop();
            mergeArgsExpr = returnsList ? `${lastArgName}: [[${keyExpr}]]` : `${lastArgName}: ${keyExpr}`;

            argNames.reverse().forEach(argName => {
              mergeArgsExpr = `${argName}: { ${mergeArgsExpr} }`;
            });
          }

          const typeNames: Array<string> = directiveArgumentMap.types;

          forEachConcreteTypeName(namedType, schema, typeNames, typeName => {
            const parsedMergeArgsExpr = parseMergeArgsExpr(mergeArgsExpr, allSelectionSetsByType[typeName]);

            const additionalArgs = directiveArgumentMap.additionalArgs;
            if (additionalArgs != null) {
              parsedMergeArgsExpr.args = mergeDeep(
                parsedMergeArgsExpr.args,
                valueFromASTUntyped(parseValue(`{ ${additionalArgs} }`, { noLocation: true }))
              );
            }

            mergedTypesResolversInfo[typeName] = {
              fieldName,
              returnsList,
              ...parsedMergeArgsExpr,
            };
          });
        }

        return undefined;
      },
    });

    Object.entries(selectionSetsByType).forEach(([typeName, selectionSet]) => {
      if (newSubschemaConfig.merge == null) {
        newSubschemaConfig.merge = Object.create(null);
      }

      if (newSubschemaConfig.merge[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName];

      mergeTypeConfig.selectionSet = print(selectionSet);
    });

    Object.entries(computedFieldSelectionSets).forEach(([typeName, selectionSets]) => {
      if (newSubschemaConfig.merge == null) {
        newSubschemaConfig.merge = Object.create(null);
      }

      if (newSubschemaConfig.merge[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName];

      if (mergeTypeConfig.fields == null) {
        mergeTypeConfig.fields = Object.create(null);
      }

      Object.entries(selectionSets).forEach(([fieldName, selectionSet]) => {
        if (mergeTypeConfig.fields[fieldName] == null) {
          mergeTypeConfig.fields[fieldName] = Object.create(null);
        }

        mergeTypeConfig.fields[fieldName].selectionSet = print(selectionSet);
        mergeTypeConfig.fields[fieldName].computed = true;
      });
    });

    Object.entries(mergedTypesResolversInfo).forEach(([typeName, mergedTypeResolverInfo]) => {
      if (newSubschemaConfig.merge == null) {
        newSubschemaConfig.merge = Object.create(null);
      }

      if (newSubschemaConfig.merge[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName];

      mergeTypeConfig.fieldName = mergedTypeResolverInfo.fieldName;

      if (mergedTypeResolverInfo.returnsList) {
        mergeTypeConfig.key = generateKeyFn(mergedTypeResolverInfo);
        mergeTypeConfig.argsFromKeys = generateArgsFromKeysFn(mergedTypeResolverInfo);
      } else {
        mergeTypeConfig.args = generateArgsFn(mergedTypeResolverInfo);
      }
    });

    Object.entries(canonicalTypesInfo).forEach(([typeName, canonicalTypeInfo]) => {
      if (newSubschemaConfig.merge == null) {
        newSubschemaConfig.merge = Object.create(null);
      }

      if (newSubschemaConfig.merge[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName];

      if (canonicalTypeInfo.canonical) {
        mergeTypeConfig.canonical = true;
      }

      if (canonicalTypeInfo.fields) {
        if (mergeTypeConfig.fields == null) {
          mergeTypeConfig.fields = Object.create(null);
        }
        Object.keys(canonicalTypeInfo.fields).forEach(fieldName => {
          if (mergeTypeConfig.fields[fieldName] == null) {
            mergeTypeConfig.fields[fieldName] = Object.create(null);
          }
          mergeTypeConfig.fields[fieldName].canonical = true;
        });
      }
    });

    return newSubschemaConfig;
  };
}

function forEachConcreteType(
  schema: GraphQLSchema,
  type: GraphQLNamedType,
  typeNames: Array<string>,
  fn: (typeName: string) => void
) {
  if (isInterfaceType(type)) {
    getImplementingTypes(type.name, schema).forEach(typeName => {
      if (typeNames == null || typeNames.includes(typeName)) {
        fn(typeName);
      }
    });
  } else if (isUnionType(type)) {
    type.getTypes().forEach(({ name: typeName }) => {
      if (typeNames == null || typeNames.includes(typeName)) {
        fn(typeName);
      }
    });
  } else if (isObjectType(type)) {
    fn(type.name);
  }
}

function generateKeyFn(mergedTypeResolverInfo: MergedTypeResolverInfo): (originalResult: any) => any {
  const keyDeclarations: Array<KeyDeclaration> = [].concat(
    ...mergedTypeResolverInfo.expansions.map(expansion => expansion.keyDeclarations)
  );
  const propertyTree = propertyTreeFromPaths(keyDeclarations.map(keyDeclaration => keyDeclaration.keyPath));

  return (originalResult: any): any => getKeys(originalResult, propertyTree);
}

function generateArgsFromKeysFn(
  mergedTypeResolverInfo: MergedTypeResolverInfo
): (keys: Array<any>) => Record<string, any> {
  const expansions = mergedTypeResolverInfo.expansions;
  const args = mergedTypeResolverInfo.args;
  return (keys: Array<any>): Record<string, any> => {
    const newArgs = mergeDeep({}, args);
    expansions.forEach(expansion => {
      const keyDeclarations = expansion.keyDeclarations;
      const expanded: Array<any> = [];
      keys.forEach(key => {
        let newValue = mergeDeep({}, expansion.valuePath);
        keyDeclarations.forEach(keyDeclaration => {
          if (keyDeclaration.valuePath.length) {
            addKey(newValue, keyDeclaration.valuePath, getKey(key, keyDeclaration.keyPath));
          } else {
            newValue = getKey(key, keyDeclaration.keyPath);
          }
        });
        expanded.push(newValue);
      });
      addKey(newArgs, expansion.valuePath, expanded);
    });
    return newArgs;
  };
}

function generateArgsFn(mergedTypeResolverInfo: MergedTypeResolverInfo): (originalResult: any) => Record<string, any> {
  const keyDeclarations = mergedTypeResolverInfo.keyDeclarations;
  const args = mergedTypeResolverInfo.args;
  return (originalResult: any): Record<string, any> => {
    const newArgs = mergeDeep({}, args);
    keyDeclarations.forEach(keyDeclaration => {
      addKey(newArgs, keyDeclaration.valuePath, getKey(originalResult, keyDeclaration.keyPath));
    });
    return newArgs;
  };
}

function buildKey(key: Array<string>): string {
  let mergedObect = {};
  key.forEach(keyDef => {
    let [aliasOrKeyPath, keyPath] = keyDef.split(':');
    let aliasPath: string;
    if (keyPath == null) {
      keyPath = aliasPath = aliasOrKeyPath;
    } else {
      aliasPath = aliasOrKeyPath;
    }
    const aliasParts = aliasPath.split('.');
    const lastAliasPart = aliasParts.pop();
    let object: any = { [lastAliasPart]: `$key.${keyPath}` };

    aliasParts.reverse().forEach(aliasPart => {
      object = { [aliasPart]: object };
    });
    mergedObect = mergeDeep(mergedObect, object);
  });

  return JSON.stringify(mergedObect).replace(/"/g, '');
}

function mergeSelectionSets(selectionSet1: SelectionSetNode, selectionSet2: SelectionSetNode): SelectionSetNode {
  const normalizedSelections: Record<string, SelectionNode> = Object.create(null);

  [selectionSet1, selectionSet2].forEach(set => {
    set.selections.forEach(selection => {
      const normalizedSelection = print(selection);
      normalizedSelections[normalizedSelection] = selection;
    });
  });

  const newSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: Object.values(normalizedSelections),
  };

  return newSelectionSet;
}

function forEachConcreteTypeName(
  returnType: GraphQLNamedType,
  schema: GraphQLSchema,
  typeNames: Array<string>,
  fn: (typeName: string) => void
): void {
  if (isInterfaceType(returnType)) {
    getImplementingTypes(returnType.name, schema).forEach(typeName => {
      if (typeNames == null || typeNames.includes(typeName)) {
        fn(typeName);
      }
    });
  } else if (isUnionType(returnType)) {
    returnType.getTypes().forEach(type => {
      if (typeNames == null || typeNames.includes(type.name)) {
        fn(type.name);
      }
    });
  } else if (isObjectType(returnType) && (typeNames == null || typeNames.includes(returnType.name))) {
    fn(returnType.name);
  }
}
