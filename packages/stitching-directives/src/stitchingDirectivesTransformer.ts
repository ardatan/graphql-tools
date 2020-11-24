import {
  getNullableType,
  GraphQLNamedType,
  isInterfaceType,
  isListType,
  isObjectType,
  isUnionType,
  print,
  SelectionSetNode,
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

import { KeyDeclaration, MergedTypeResolverInfo, TypeMergingDirectivesOptions } from './types';

import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { parseMergeArgsExpr } from './parseMergeArgsExpr';
import { addKey, getKey, getKeys, propertyTreeFromPaths } from './properties';

export function stitchingDirectivesTransformer(
  options: TypeMergingDirectivesOptions = {}
): (subschemaConfig: SubschemaConfig) => SubschemaConfig {
  const { baseDirectiveName, computedDirectiveName, mergeDirectiveName } = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  return (subschemaConfig: SubschemaConfig): SubschemaConfig => {
    const newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);

    const selectionSetsByType: Record<string, SelectionSetNode> = Object.create(null);
    const selectionSetsByField: Record<string, Record<string, SelectionSetNode>> = Object.create(null);
    const mergedTypesResolversInfo: Record<string, MergedTypeResolverInfo> = Object.create(null);

    const schema = subschemaConfig.schema;

    mapSchema(schema, {
      [MapperKind.OBJECT_TYPE]: type => {
        const directives = getDirectives(schema, type);

        if (directives[baseDirectiveName]) {
          const directiveArgumentMap = directives[baseDirectiveName];
          const selectionSet = parseSelectionSet(directiveArgumentMap.selectionSet);
          selectionSetsByType[type.name] = selectionSet;
        }

        return undefined;
      },
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const directives = getDirectives(schema, fieldConfig);

        if (directives[computedDirectiveName]) {
          const directiveArgumentMap = directives[computedDirectiveName];
          const selectionSet = parseSelectionSet(directiveArgumentMap.selectionSet);
          if (!selectionSetsByField[typeName]) {
            selectionSetsByField[typeName] = Object.create(null);
          }
          selectionSetsByField[typeName][fieldName] = selectionSet;
        }

        return undefined;
      },
    });

    const allSelectionSetsByType: Record<string, Array<SelectionSetNode>> = Object.create(null);

    Object.entries(selectionSetsByType).forEach(([typeName, selectionSet]) => {
      if (allSelectionSetsByType[typeName] == null) {
        allSelectionSetsByType[typeName] = [selectionSet];
      } else {
        allSelectionSetsByType[typeName].push(selectionSet);
      }
    });

    Object.entries(selectionSetsByField).forEach(([typeName, selectionSets]) => {
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
        const directives = getDirectives(schema, fieldConfig);

        if (directives[mergeDirectiveName]) {
          const directiveArgumentMap = directives[mergeDirectiveName];

          let returnType = getNullableType(fieldConfig.type);
          let returnsList = false;

          if (isListType(returnType)) {
            returnsList = true;
            returnType = getNullableType(returnType.ofType);
          }

          let mergeArgsExpr = directiveArgumentMap.argsExpr;
          if (mergeArgsExpr == null) {
            const args = Object.keys(fieldConfig.args);

            const argName = args[0];

            mergeArgsExpr = returnsList ? `${argName}: [[$key]]` : `${argName}: $key`;
          }

          const parsedMergeArgsExpr = parseMergeArgsExpr(
            mergeArgsExpr,
            allSelectionSetsByType[(returnType as GraphQLNamedType).name]
          );

          const typeNames: Array<string> = directiveArgumentMap.types;

          if (isInterfaceType(returnType)) {
            getImplementingTypes(returnType.name, schema).forEach(typeName => {
              if (typeNames == null || typeNames.includes(typeName)) {
                mergedTypesResolversInfo[typeName] = {
                  fieldName,
                  returnsList,
                  ...parsedMergeArgsExpr,
                };
              }
            });
          } else if (isUnionType(returnType)) {
            returnType.getTypes().forEach(type => {
              if (typeNames == null || typeNames.includes(type.name)) {
                mergedTypesResolversInfo[type.name] = {
                  fieldName,
                  returnsList,
                  ...parsedMergeArgsExpr,
                };
              }
            });
          } else if (isObjectType(returnType)) {
            mergedTypesResolversInfo[returnType.name] = {
              fieldName,
              returnsList,
              ...parsedMergeArgsExpr,
            };
          }
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

    Object.entries(selectionSetsByField).forEach(([typeName, selectionSets]) => {
      if (newSubschemaConfig.merge == null) {
        newSubschemaConfig.merge = Object.create(null);
      }

      if (newSubschemaConfig.merge[typeName] == null) {
        newSubschemaConfig.merge[typeName] = Object.create(null);
      }

      const mergeTypeConfig = newSubschemaConfig.merge[typeName];

      if (mergeTypeConfig.computedFields == null) {
        mergeTypeConfig.computedFields = Object.create(null);
      }

      Object.entries(selectionSets).forEach(([fieldName, selectionSet]) => {
        if (mergeTypeConfig.computedFields[fieldName] == null) {
          mergeTypeConfig.computedFields[fieldName] = Object.create(null);
        }

        mergeTypeConfig.computedFields[fieldName].selectionSet = print(selectionSet);
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

    return newSubschemaConfig;
  };
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
