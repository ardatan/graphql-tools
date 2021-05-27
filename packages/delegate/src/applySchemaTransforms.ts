import { GraphQLSchema } from 'graphql';

import { cloneSchema } from '@graphql-tools/utils';

import { SubschemaConfig } from './types';

export function applySchemaTransforms<TContext = Record<string, any>>(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  transformedSchema?: GraphQLSchema
): GraphQLSchema {
  const schemaTransforms = subschemaConfig.transforms;

  if (schemaTransforms == null) {
    return originalWrappingSchema;
  }

  return schemaTransforms.reduce(
    (schema: GraphQLSchema, transform) =>
      transform.transformSchema != null
        ? transform.transformSchema(cloneSchema(schema), subschemaConfig, transformedSchema)
        : schema,
    originalWrappingSchema
  );
}
