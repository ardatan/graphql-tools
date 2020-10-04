import { GraphQLSchema } from 'graphql';

import { cloneSchema } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from './types';
import { isSubschemaConfig } from './subschemaConfig';

export function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaOrSubschemaConfig?: GraphQLSchema | SubschemaConfig,
  transforms?: Array<Transform>,
  transformedSchema?: GraphQLSchema
): GraphQLSchema {
  let schemaTransforms: Array<Transform> = [];

  if (isSubschemaConfig(subschemaOrSubschemaConfig) && subschemaOrSubschemaConfig.transforms != null) {
    schemaTransforms = schemaTransforms.concat(subschemaOrSubschemaConfig.transforms);
  }

  if (transforms) {
    schemaTransforms = schemaTransforms.concat(transforms);
  }

  return schemaTransforms.reduce(
    (schema: GraphQLSchema, transform: Transform) =>
      transform.transformSchema != null
        ? transform.transformSchema(cloneSchema(schema), subschemaOrSubschemaConfig, transforms, transformedSchema)
        : schema,
    originalWrappingSchema
  );
}
