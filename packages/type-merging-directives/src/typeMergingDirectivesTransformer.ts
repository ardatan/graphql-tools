import {
  getNullableType,
  isInterfaceType,
  isListType,
  isObjectType,
  isUnionType,
  print,
  SelectionSetNode,
} from 'graphql';

import { cloneSubschemaConfig, SubschemaConfig } from '@graphql-tools/delegate';
import { getDirectives, getImplementingTypes, MapperKind, mapSchema, parseSelectionSet } from '@graphql-tools/utils';

import { MergedTypeResolverInfo, TypeMergingDirectivesOptions } from './types';

import { defaultTypeMergingDirectiveOptions } from './defaultTypeMergingDirectiveOptions';
import { parseMergeArgsExpr } from './parseMergeArgsExpr';

export function typeMergingDirectivesTransformer(
  options: TypeMergingDirectivesOptions = {}
): (subschemaConfig: SubschemaConfig) => SubschemaConfig {
  const { baseDirectiveName, computedDirectiveName, mergeDirectiveName } = {
    ...defaultTypeMergingDirectiveOptions,
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

          const parsedMergeArgsExpr = parseMergeArgsExpr(mergeArgsExpr);

          if (isInterfaceType(returnType)) {
            getImplementingTypes(returnType.name, schema).forEach(typeName => {
              mergedTypesResolversInfo[typeName] = {
                fieldName,
                returnsList,
                ...parsedMergeArgsExpr,
              };
            });
          } else if (isUnionType(returnType)) {
            returnType.getTypes().forEach(type => {
              mergedTypesResolversInfo[type.name] = {
                fieldName,
                returnsList,
                ...parsedMergeArgsExpr,
              };
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
    });

    return newSubschemaConfig;
  };
}
