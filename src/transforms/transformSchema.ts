import { GraphQLSchema } from 'graphql';
import { addResolveFunctionsToSchema } from '../schemaGenerator';

import { visitSchema } from '../transforms/visitSchema';
import { Transform, applySchemaTransforms } from '../transforms/transforms';
import {
  generateProxyingResolvers,
  generateSimpleMapping,
} from '../stitching/resolvers';

export default function transformSchema(
  targetSchema: GraphQLSchema,
  transforms: Array<Transform>,
): GraphQLSchema & { transforms: Array<Transform> } {
  let schema = visitSchema(targetSchema, {}, true);
  const mapping = generateSimpleMapping(targetSchema);
  const resolvers = generateProxyingResolvers(
    targetSchema,
    transforms,
    mapping,
  );
  addResolveFunctionsToSchema(schema, resolvers, {
    allowResolversNotInSchema: true,
  });
  schema = applySchemaTransforms(schema, transforms);
  (schema as any).transforms = transforms;
  return schema as GraphQLSchema & { transforms: Array<Transform> };
}
