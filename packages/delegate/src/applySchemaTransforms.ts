import { GraphQLSchema } from 'graphql';

import { cloneSchema } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from './types';

export function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig?: SubschemaConfig,
  transforms?: Array<Transform>,
  transformedSchema?: GraphQLSchema
): GraphQLSchema {
  let schemaTransforms: Array<Transform> = [];

  if (subschemaConfig?.transforms != null) {
    schemaTransforms = schemaTransforms.concat(subschemaConfig.transforms);
  }

  if (transforms) {
    schemaTransforms = schemaTransforms.concat(transforms);
  }

  return schemaTransforms.reduce(
    (schema: GraphQLSchema, transform: Transform) =>
      transform.transformSchema != null
        ? transform.transformSchema(cloneSchema(schema), subschemaConfig, transforms, transformedSchema)
        : schema,
    originalWrappingSchema
  );
}
