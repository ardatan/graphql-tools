import { GraphQLSchema } from 'graphql';

import { SubschemaConfig } from '@graphql-tools/delegate';

import { TypeMergingDirectivesOptions } from './types';

import { defaultTypeMergingDirectiveOptions } from './defaultTypeMergingDirectiveOptions';
import { typeMergingDirectivesValidator } from './typeMergingDirectivesValidator';
import { typeMergingDirectivesTransformer } from './typeMergingDirectivesTransformer';

export function typeMergingDirectives(
  options: TypeMergingDirectivesOptions = {}
): {
  typeMergingDirectivesTypeDefs: string;
  typeMergingDirectivesValidator: (schema: GraphQLSchema) => GraphQLSchema;
  typeMergingDirectivesTransformer: (subschemaConfig: SubschemaConfig) => SubschemaConfig;
} {
  const finalOptions = {
    ...defaultTypeMergingDirectiveOptions,
    ...options,
  };

  const { baseDirectiveName, computedDirectiveName, mergeDirectiveName } = finalOptions;

  return {
    typeMergingDirectivesTypeDefs: `
      directive @${baseDirectiveName}(selectionSet: String!) on OBJECT
      directive @${computedDirectiveName}(selectionSet: String!) on FIELD_DEFINITION
      directive @${mergeDirectiveName}(argsExpr: String) on FIELD_DEFINITION
    `,
    typeMergingDirectivesValidator: typeMergingDirectivesValidator(finalOptions),
    typeMergingDirectivesTransformer: typeMergingDirectivesTransformer(finalOptions),
  };
}
