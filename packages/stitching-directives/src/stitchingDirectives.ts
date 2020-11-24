import { GraphQLSchema } from 'graphql';

import { SubschemaConfig } from '@graphql-tools/delegate';

import { TypeMergingDirectivesOptions } from './types';

import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { stitchingDirectivesValidator } from './stitchingDirectivesValidator';
import { stitchingDirectivesTransformer } from './stitchingDirectivesTransformer';

export function stitchingDirectives(
  options: TypeMergingDirectivesOptions = {}
): {
  stitchingDirectivesTypeDefs: string;
  stitchingDirectivesValidator: (schema: GraphQLSchema) => GraphQLSchema;
  stitchingDirectivesTransformer: (subschemaConfig: SubschemaConfig) => SubschemaConfig;
} {
  const finalOptions = {
    ...defaultStitchingDirectiveOptions,
    ...options,
  };

  const { baseDirectiveName, computedDirectiveName, mergeDirectiveName } = finalOptions;

  return {
    stitchingDirectivesTypeDefs: `
      directive @${baseDirectiveName}(selectionSet: String!) on OBJECT
      directive @${computedDirectiveName}(selectionSet: String!) on FIELD_DEFINITION
      directive @${mergeDirectiveName}(argsExpr: String) on FIELD_DEFINITION
    `,
    stitchingDirectivesValidator: stitchingDirectivesValidator(finalOptions),
    stitchingDirectivesTransformer: stitchingDirectivesTransformer(finalOptions),
  };
}
