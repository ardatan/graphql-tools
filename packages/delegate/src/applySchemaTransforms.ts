import { GraphQLSchema } from 'graphql';

import { cloneSchema } from '@graphql-tools/utils';

import { Transform } from './types';

export function applySchemaTransforms(originalSchema: GraphQLSchema, transforms: Array<Transform>): GraphQLSchema {
  return transforms.reduce(
    (schema: GraphQLSchema, transform: Transform) =>
      transform.transformSchema != null ? transform.transformSchema(cloneSchema(schema)) : schema,
    originalSchema
  );
}
