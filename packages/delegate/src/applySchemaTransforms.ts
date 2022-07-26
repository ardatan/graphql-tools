import { GraphQLSchema } from '@graphql-tools/graphql';

import { SubschemaConfig } from './types.js';

export function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig<any, any, any, any>,
  transformedSchema?: GraphQLSchema
): GraphQLSchema {
  const schemaTransforms = subschemaConfig.transforms;

  if (schemaTransforms == null) {
    return originalWrappingSchema;
  }

  return schemaTransforms.reduce(
    (schema: GraphQLSchema, transform) =>
      transform.transformSchema != null
        ? transform.transformSchema(schema, subschemaConfig, transformedSchema)
        : schema,
    originalWrappingSchema
  );
}
