import { GraphQLDirective, GraphQLList, GraphQLNonNull, GraphQLSchema, GraphQLString } from 'graphql';

import { SubschemaConfig } from '@graphql-tools/delegate';

import { StitchingDirectivesFinalOptions, StitchingDirectivesOptions } from './types.js';

import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions.js';
import { stitchingDirectivesValidator } from './stitchingDirectivesValidator.js';
import { stitchingDirectivesTransformer } from './stitchingDirectivesTransformer.js';

export interface StitchingDirectivesResult {
  keyDirectiveTypeDefs: string;
  computedDirectiveTypeDefs: string;
  mergeDirectiveTypeDefs: string;
  canonicalDirectiveTypeDefs: string;
  stitchingDirectivesTypeDefs: string; // for backwards compatibility
  allStitchingDirectivesTypeDefs: string;
  stitchingDirectivesValidator: (schema: GraphQLSchema) => GraphQLSchema;
  stitchingDirectivesTransformer: (subschemaConfig: SubschemaConfig) => SubschemaConfig;
  keyDirective: GraphQLDirective;
  computedDirective: GraphQLDirective;
  mergeDirective: GraphQLDirective;
  canonicalDirective: GraphQLDirective;
  allStitchingDirectives: Array<GraphQLDirective>;
}

export function stitchingDirectives(options: StitchingDirectivesOptions = {}): StitchingDirectivesResult {
  const finalOptions: StitchingDirectivesFinalOptions = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  const { keyDirectiveName, computedDirectiveName, mergeDirectiveName, canonicalDirectiveName } = finalOptions;

  const keyDirectiveTypeDefs = /* GraphQL */ `directive @${keyDirectiveName}(selectionSet: String!) on OBJECT`;
  const computedDirectiveTypeDefs = /* GraphQL */ `directive @${computedDirectiveName}(selectionSet: String!) on FIELD_DEFINITION`;
  const mergeDirectiveTypeDefs = /* GraphQL */ `directive @${mergeDirectiveName}(argsExpr: String, keyArg: String, keyField: String, key: [String!], additionalArgs: String) on FIELD_DEFINITION`;
  const canonicalDirectiveTypeDefs = /* GraphQL */ `directive @${canonicalDirectiveName} on OBJECT | INTERFACE | INPUT_OBJECT | UNION | ENUM | SCALAR | FIELD_DEFINITION | INPUT_FIELD_DEFINITION`;

  const keyDirective = new GraphQLDirective({
    name: keyDirectiveName,
    locations: ['OBJECT'] as any[],
    args: {
      selectionSet: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  const computedDirective = new GraphQLDirective({
    name: computedDirectiveName,
    locations: ['FIELD_DEFINITION'] as any[],
    args: {
      selectionSet: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  const mergeDirective = new GraphQLDirective({
    name: mergeDirectiveName,
    locations: ['FIELD_DEFINITION'] as any[],
    args: {
      argsExpr: { type: GraphQLString },
      keyArg: { type: GraphQLString },
      keyField: { type: GraphQLString },
      key: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
      additionalArgs: { type: GraphQLString },
    },
  });

  const canonicalDirective = new GraphQLDirective({
    name: canonicalDirectiveName,
    locations: [
      'OBJECT',
      'INTERFACE',
      'INPUT_OBJECT',
      'UNION',
      'ENUM',
      'SCALAR',
      'FIELD_DEFINITION',
      'INPUT_FIELD_DEFINITION',
    ] as any[],
  });

  const allStitchingDirectivesTypeDefs = [
    keyDirectiveTypeDefs,
    computedDirectiveTypeDefs,
    mergeDirectiveTypeDefs,
    canonicalDirectiveTypeDefs,
  ].join('\n');

  return {
    keyDirectiveTypeDefs,
    computedDirectiveTypeDefs,
    mergeDirectiveTypeDefs,
    canonicalDirectiveTypeDefs,
    stitchingDirectivesTypeDefs: allStitchingDirectivesTypeDefs, // for backwards compatibility
    allStitchingDirectivesTypeDefs,
    keyDirective,
    computedDirective,
    mergeDirective,
    canonicalDirective,
    allStitchingDirectives: [keyDirective, computedDirective, mergeDirective, canonicalDirective],
    stitchingDirectivesValidator: stitchingDirectivesValidator(finalOptions),
    stitchingDirectivesTransformer: stitchingDirectivesTransformer(finalOptions),
  };
}
