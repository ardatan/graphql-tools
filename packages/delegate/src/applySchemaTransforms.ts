import { GraphQLSchema } from 'graphql';

import { cloneSchema } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from './types';

export function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig,
  transformedSchema?: GraphQLSchema
): GraphQLSchema {
  const schemaTransforms = subschemaConfig.transforms;

  if (schemaTransforms == null) {
    return originalWrappingSchema;
  }

  return schemaTransforms.reduce(
    (schema: GraphQLSchema, transform: Transform) =>
      transform.transformSchema != null
        ? transform.transformSchema(cloneSchema(schema), subschemaConfig, transformedSchema)
        : schema,
    originalWrappingSchema
  );
}
