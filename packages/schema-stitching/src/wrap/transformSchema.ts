import { GraphQLSchema } from 'graphql';

import { Transform, SubschemaConfig, GraphQLSchemaWithTransforms } from '../Interfaces';

import { wrapSchema } from './wrapSchema';

// This function is deprecated in favor of wrapSchema as the name is misleading.
// transformSchema does not just "transform" a schema, it wraps a schema with transforms
// using a round of delegation.
// The applySchemaTransforms function actually "transforms" the schema and is used during wrapping.
export function transformSchema(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform>
): GraphQLSchemaWithTransforms {
  const schema: GraphQLSchemaWithTransforms = wrapSchema(subschemaOrSubschemaConfig, transforms);

  schema.transforms = transforms.slice().reverse();
  return schema;
}
