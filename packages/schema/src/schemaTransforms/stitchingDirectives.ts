import { GraphQLScalarType, GraphQLSchema } from 'graphql';

import { mapSchema, parseSelectionSet } from '@graphql-tools/utils';

import { addResolversToSchema } from '../addResolversToSchema';

interface StitchingDirectivesOptions {
  baseDirectiveName?: string;
  computedDirectiveName?: string;
  mergeDirectiveName?: string;
  selectionSetScalarName?: string;
  argsExprScalarName?: string;
  keyScalarName?: string;
  keyArgScalarName?: string;
  typesScalarName?: string;
}

const defaultStitchingDirectiveOptions = {
  baseDirectiveName: 'base',
  computedDirectiveName: 'computed',
  mergeDirectiveName: 'merge',
  selectionSetScalarName: '_SelectionSet',
  argsExprScalarName: '_ArgsExpr',
  argsScalarName: '_Args',
  keyScalarName: '_Key',
  keyArgScalarName: '_KeyArgs',
  typesScalarName: '_Types',
};

export function stitchingDirectives(options: StitchingDirectivesOptions = {}) {
  const {
    baseDirectiveName,
    computedDirectiveName,
    mergeDirectiveName,
    selectionSetScalarName,
    argsExprScalarName,
    argsScalarName,
    keyScalarName,
    keyArgScalarName,
    typesScalarName,
  } = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  return {
    stitchingDirectiveTypeDefs: `
      scalar ${selectionSetScalarName}
      scalar ${argsExprScalarName}
      scalar ${argsScalarName}
      scalar ${keyScalarName}
      scalar ${keyArgScalarName}
      scalar ${typesScalarName}
      directive @${baseDirectiveName}(selectionSet: ${selectionSetScalarName}!) on OBJECT
      directive @${computedDirectiveName}(selectionSet: ${selectionSetScalarName}!) on FIELD_DEFINITION
      directive @${mergeDirectiveName}(argsExpr: ${argsExprScalarName}, args: ${argsScalarName}, key: ${keyScalarName}, keyArg: ${keyArgScalarName}, types: ${typesScalarName}) on FIELD_DEFINITION
    `,
    stitchingDirectivesTransformer: (schema: GraphQLSchema) => {
      // Note: stitchingDirectivesTransformer is a schema transformer, not a SubschemaConfig transformer
      // It operates within the makeExecutableSchema pipeline, validating the stitching directives, purely to validate the utilized stitching directives,
      // without actually transforming the schema.
      //
      // Each subschema will expose its full SDL with directives in whatever manner it sees fit
      //   -- a schema registry server
      //   -- a public or private package repository
      //   -- a source control system such as git
      //   -- or simply via a root field on each subschema such as `Query.__sdl`
      //
      // The directives will be used by the gateway to transform the subschema config, i.e. generate selectionSet, args, key, argsFromKeys fields
      //
      // Subschemas should be able to check to ensure that the stitching directives they use are valid -- to the extent possible -- so that
      // stitching setup failures should be flagged when pushing a new version of each subschema, prior to loading by the Gateway.
      //
      // For example:
      //   (a) @base and @computed fields should at the least have valid selectionSet syntax.
      //   (b) @merge argsExpr should be parseable, i.e. contain valid uses of expansion/key declarations.
      //
      // This will be accomplished by using scalar parsing to throw on errors of the individual arguments, as well as mapSchema to
      // inspect the different combinations, i.e.:
      //   (a) one can use of either `argsExpr` or the more convenient `args`/`key`/`keyArg` shorthand, but not both
      //   (b) one can use the `types` qualifer only for fields returning abstract types.

      const schemaWithScalarResolvers = addResolversToSchema({
        schema,
        resolvers: {
          [selectionSetScalarName]: new GraphQLScalarType({
            name: selectionSetScalarName,
            parseValue: (value: any) => {
              // not firing !!!
              // because mapSchema only reparsed default values for output object field arguments and for input object fields, but not for directive arguments
              return parseSelectionSet(value);
            },
          }),
          [argsExprScalarName]: {
            parseValue: (value: any) => value,
          },
          [argsScalarName]: {
            parseValue: (value: any) => value,
          },
          [keyScalarName]: {
            parseValue: (value: any) => value,
          },
          [keyArgScalarName]: {
            parseValue: (value: any) => value,
          },
          [typesScalarName]: {
            parseValue: (value: any) => value,
          },
        },
      });

      mapSchema(schemaWithScalarResolvers, {});

      return schemaWithScalarResolvers;
    },
  };
}
