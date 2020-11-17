import { GraphQLSchema } from 'graphql';

import { mapSchema } from '@graphql-tools/utils';

interface StitchingDirectivesOptions {
  baseDirectiveName: string;
  computedDirectiveName: string;
  mergeDirectiveName: string;
}

export function stitchingDirectives({
  baseDirectiveName,
  computedDirectiveName,
  mergeDirectiveName,
}: StitchingDirectivesOptions) {
  return {
    stitchingDirectiveTypeDefs: `
      scalar _SelectionSet
      scalar _ArgsExpr
      scalar _Args
      scalar _Key
      scalar _KeyArg
      directive @${baseDirectiveName}(selectionSet: _SelectionSet!) on OBJECT
      directive @${computedDirectiveName}(selectionSet: _SelectionSet!) on FIELD_DEFINITION
      directive @${mergeDirectiveName}(argsExpr: _ArgsExpr, args: _Args, key: _Key, keyArg: _KeyArg, types: [String!]) on FIELD_DEFINITION
    `,
    stitchingDirectivesTransformer: (schema: GraphQLSchema) =>
      mapSchema(schema, {
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
      }),
  };
}
