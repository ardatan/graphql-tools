import { GraphQLDirective, GraphQLList, GraphQLNonNull, GraphQLSchema, GraphQLString } from 'graphql';

import { SubschemaConfig } from '@graphql-tools/delegate';

import { StitchingDirectivesOptions } from './types';

import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { stitchingDirectivesValidator } from './stitchingDirectivesValidator';
import { stitchingDirectivesTransformer } from './stitchingDirectivesTransformer';

export function stitchingDirectives(
  options: StitchingDirectivesOptions = {}
): {
  keyDirectiveTypeDefs: string;
  computedDirectiveTypeDefs: string;
  mergeDirectiveTypeDefs: string;
  stitchingDirectivesTypeDefs: string;
  stitchingDirectivesValidator: (schema: GraphQLSchema) => GraphQLSchema;
  stitchingDirectivesTransformer: (subschemaConfig: SubschemaConfig) => SubschemaConfig;
  keyDirective: GraphQLDirective;
  computedDirective: GraphQLDirective;
  mergeDirective: GraphQLDirective;
  stitchingDirectives: Array<GraphQLDirective>;
} {
  const finalOptions = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  const { keyDirectiveName, computedDirectiveName, mergeDirectiveName } = finalOptions;

  const keyDirectiveTypeDefs = `directive @${keyDirectiveName}(selectionSet: String!) on OBJECT`;
  const computedDirectiveTypeDefs = `directive @${computedDirectiveName}(selectionSet: String!) on FIELD_DEFINITION`;
  const mergeDirectiveTypeDefs = `directive @${mergeDirectiveName}(argsExpr: String, keyArg: String, keyField: String, key: [String!], additionalArgs: String) on FIELD_DEFINITION`;

  const keyDirective = new GraphQLDirective({
    name: keyDirectiveName,
    locations: ['OBJECT'],
    args: {
      selectionSet: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  const computedDirective = new GraphQLDirective({
    name: computedDirectiveName,
    locations: ['FIELD_DEFINITION'],
    args: {
      selectionSet: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  const mergeDirective = new GraphQLDirective({
    name: mergeDirectiveName,
    locations: ['FIELD_DEFINITION'],
    args: {
      argsExpr: { type: GraphQLString },
      keyArg: { type: GraphQLString },
      keyField: { type: GraphQLString },
      key: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
      additionalArgs: { type: GraphQLString },
    },
  });

  return {
    keyDirectiveTypeDefs,
    computedDirectiveTypeDefs,
    mergeDirectiveTypeDefs,
    stitchingDirectivesTypeDefs: `
      ${keyDirectiveTypeDefs}
      ${computedDirectiveTypeDefs}
      ${mergeDirectiveTypeDefs}
    `,
    keyDirective,
    computedDirective,
    mergeDirective,
    stitchingDirectives: [keyDirective, computedDirective, mergeDirective],
    stitchingDirectivesValidator: stitchingDirectivesValidator(finalOptions),
    stitchingDirectivesTransformer: stitchingDirectivesTransformer(finalOptions),
  };
}
