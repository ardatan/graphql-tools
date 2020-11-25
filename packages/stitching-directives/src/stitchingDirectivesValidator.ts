import {
  getNullableType,
  GraphQLSchema,
  isAbstractType,
  isInterfaceType,
  isListType,
  isNamedType,
  isObjectType,
  isUnionType,
  parseValue,
} from 'graphql';

import { getDirectives, getImplementingTypes, MapperKind, mapSchema, parseSelectionSet } from '@graphql-tools/utils';

import { StitchingDirectivesOptions } from './types';

import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { parseMergeArgsExpr } from './parseMergeArgsExpr';

const dottedNameRegEx = /^[_A-Za-z][_0-9A-Za-z]*(.[_A-Za-z][_0-9A-Za-z]*)*$/;

export function stitchingDirectivesValidator(
  options: StitchingDirectivesOptions = {}
): (schema: GraphQLSchema) => GraphQLSchema {
  const { baseDirectiveName, computedDirectiveName, mergeDirectiveName } = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  return (schema: GraphQLSchema): GraphQLSchema => {
    const queryTypeName = schema.getQueryType()?.name;

    mapSchema(schema, {
      [MapperKind.OBJECT_TYPE]: type => {
        const directives = getDirectives(schema, type);

        if (directives[baseDirectiveName]) {
          const directiveArgumentMap = directives[baseDirectiveName];
          parseSelectionSet(directiveArgumentMap.selectionSet);
        }

        return undefined;
      },
      [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
        const directives = getDirectives(schema, fieldConfig);

        if (directives[computedDirectiveName]) {
          const directiveArgumentMap = directives[computedDirectiveName];
          parseSelectionSet(directiveArgumentMap.selectionSet);
        }

        if (directives[mergeDirectiveName]) {
          const directiveArgumentMap = directives[mergeDirectiveName];

          if (typeName !== queryTypeName) {
            throw new Error('@merge directive may be used only for root fields of the root Query type.');
          }

          let returnType = getNullableType(fieldConfig.type);

          if (isListType(returnType)) {
            returnType = getNullableType(returnType.ofType);
          }

          if (!isNamedType(returnType)) {
            throw new Error('@merge directive must be used on a field that returns an object or a list of objects.');
          }

          const mergeArgsExpr = directiveArgumentMap.argsExpr;
          if (mergeArgsExpr != null) {
            parseMergeArgsExpr(mergeArgsExpr);
          }

          const args = Object.keys(fieldConfig.args);

          const keyArg = directiveArgumentMap.keyArg;
          if (keyArg == null) {
            if (args.length !== 1) {
              throw new Error(
                'Cannot use @merge directive without `keyArg` argument if resolver takes more than one argument.'
              );
            }
          } else if (!keyArg.match(dottedNameRegEx)) {
            throw new Error(
              '`keyArg` argument for @merge directive must be a set of valid GraphQL SDL names separated by periods.'
            );
          }

          const additionalArgs = directiveArgumentMap.additionalArgs;
          if (additionalArgs != null) {
            parseValue(`{ ${additionalArgs} }`, { noLocation: true });
          }

          if (mergeArgsExpr != null && (keyArg != null || additionalArgs != null)) {
            throw new Error('Cannot use @merge directive with both `argsExpr` argument and any additional argument.');
          }

          if (!isInterfaceType(returnType) && !isUnionType(returnType) && !isObjectType(returnType)) {
            throw new Error(
              '@merge directive may be used only with resolver that return an object, interface, or union.'
            );
          }

          const typeNames: Array<string> = directiveArgumentMap.types;
          if (typeNames != null) {
            if (!isAbstractType(returnType)) {
              throw new Error('Types argument can only be used with a field that returns an abstract type.');
            }
            const implementingTypes = isInterfaceType(returnType)
              ? getImplementingTypes(returnType.name, schema).map(typeName => schema.getType(typeName))
              : returnType.getTypes();
            const implementingTypeNames = implementingTypes.map(type => type.name);
            typeNames.forEach(typeName => {
              if (!implementingTypeNames.includes(typeName)) {
                throw new Error(
                  `Types argument can only include only type names that implement the field return type's abstract type.`
                );
              }
            });
          }
        }

        return undefined;
      },
    });

    return schema;
  };
}
