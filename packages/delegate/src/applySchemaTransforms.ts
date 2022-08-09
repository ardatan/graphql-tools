import { memoize2 } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';

import { SubschemaConfig } from './types.js';

// TODO: Instead of memoization, we can make sure that this isn't called multiple times
export const applySchemaTransforms = memoize2(function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig<any, any, any, any>
): GraphQLSchema {
  const schemaTransforms = subschemaConfig.transforms;

  if (schemaTransforms == null) {
    return originalWrappingSchema;
  }

  return schemaTransforms.reduce(
    (schema: GraphQLSchema, transform) => transform.transformSchema?.(schema, subschemaConfig) || schema,
    originalWrappingSchema
  );
});
