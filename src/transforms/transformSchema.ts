import { GraphQLSchema } from 'graphql';
import { addResolveFunctionsToSchema } from '../makeExecutableSchema';

import { visitSchema } from '../transforms/visitSchema';
import { Transform, applySchemaTransforms } from '../transforms/transforms';
import {
  generateProxyingResolvers,
  generateSimpleMapping,
} from '../stitching/resolvers';
import {
  SchemaExecutionConfig,
  isSchemaExecutionConfig,
} from '../Interfaces';

export default function transformSchema(
  schemaOrSchemaExecutionConfig: GraphQLSchema | SchemaExecutionConfig,
  transforms: Array<Transform>,
): GraphQLSchema & { transforms: Array<Transform> } {
  const targetSchema: GraphQLSchema = isSchemaExecutionConfig(schemaOrSchemaExecutionConfig) ?
    schemaOrSchemaExecutionConfig.schema : schemaOrSchemaExecutionConfig;

  let schema = visitSchema(targetSchema, {}, true);
  const mapping = generateSimpleMapping(targetSchema);
  const resolvers = generateProxyingResolvers(
    schemaOrSchemaExecutionConfig,
    transforms,
    mapping,
  );
  schema = addResolveFunctionsToSchema({
    schema,
    resolvers,
    resolverValidationOptions: {
      allowResolversNotInSchema: true,
    },
  });
  schema = applySchemaTransforms(schema, transforms);
  (schema as any).transforms = transforms;
  return schema as GraphQLSchema & { transforms: Array<Transform> };
}
