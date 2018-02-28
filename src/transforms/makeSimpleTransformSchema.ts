import { GraphQLSchema } from 'graphql';
import { addResolveFunctionsToSchema } from '../schemaGenerator';

import { Transform, applySchemaTransforms } from '../transforms/transforms';
import {
  generateProxyingResolvers,
  generateSimpleMapping,
} from '../stitching/resolvers';

export default function makeSimpleTransformSchema(
  targetSchema: GraphQLSchema,
  transforms: Array<Transform>,
) {
  const schema = applySchemaTransforms(targetSchema, transforms);
  const mapping = generateSimpleMapping(targetSchema);
  const resolvers = generateProxyingResolvers(
    targetSchema,
    transforms,
    mapping,
  );
  addResolveFunctionsToSchema(schema, resolvers, {
    allowResolversNotInSchema: true,
  });
  return schema;
}
