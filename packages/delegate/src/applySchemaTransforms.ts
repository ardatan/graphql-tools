import { GraphQLSchema } from 'graphql';

import { cloneSchema } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from './types';

export function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  transforms: Array<Transform>,
  subschema: SubschemaConfig
): GraphQLSchema {
  return transforms.reduce(
    (schema: GraphQLSchema, transform: Transform) =>
      transform.transformSchema != null ? transform.transformSchema(cloneSchema(schema), subschema) : schema,
    originalWrappingSchema
  );
}
