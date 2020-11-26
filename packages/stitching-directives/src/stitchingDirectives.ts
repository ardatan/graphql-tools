import { GraphQLSchema } from 'graphql';

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
} {
  const finalOptions = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  const { keyDirectiveName, computedDirectiveName, mergeDirectiveName } = finalOptions;

  const keyDirectiveTypeDefs = `directive @${keyDirectiveName}(selectionSet: String!) on OBJECT`;
  const computedDirectiveTypeDefs = `directive @${computedDirectiveName}(selectionSet: String!) on FIELD_DEFINITION`;
  const mergeDirectiveTypeDefs = `directive @${mergeDirectiveName}(argsExpr: String, keyArg: String, keyField: String, key: [String!], additionalArgs: String) on FIELD_DEFINITION`;

  return {
    keyDirectiveTypeDefs,
    computedDirectiveTypeDefs,
    mergeDirectiveTypeDefs,
    stitchingDirectivesTypeDefs: `
      ${keyDirectiveTypeDefs}
      ${computedDirectiveTypeDefs}
      ${mergeDirectiveTypeDefs}
    `,
    stitchingDirectivesValidator: stitchingDirectivesValidator(finalOptions),
    stitchingDirectivesTransformer: stitchingDirectivesTransformer(finalOptions),
  };
}
