import { GraphQLSchema } from 'graphql';
import { addResolveFunctionsToSchema } from '../makeExecutableSchema';

import { Transform, applySchemaTransforms } from '../transforms/transforms';
import {
  generateProxyingResolvers,
  stripResolvers,
} from '../stitching/resolvers';
import {
  SchemaExecutionConfig,
  isSchemaExecutionConfig,
} from '../Interfaces';

import { cloneSchema } from '../utils/clone';

export function wrapSchema(
  schemaOrSchemaExecutionConfig: GraphQLSchema | SchemaExecutionConfig,
  transforms: Array<Transform>,
): GraphQLSchema {
  const targetSchema: GraphQLSchema = isSchemaExecutionConfig(schemaOrSchemaExecutionConfig) ?
    schemaOrSchemaExecutionConfig.schema : schemaOrSchemaExecutionConfig;

  const schema = cloneSchema(targetSchema);
  stripResolvers(schema);

  const resolvers = generateProxyingResolvers(
    schemaOrSchemaExecutionConfig,
    transforms.slice().reverse().map(transform => {
      return transform.resolversTransformResult
        ? {
          transformRequest: originalRequest => transform.transformRequest(originalRequest)
        } :
        transform;
    }),
  );
  addResolveFunctionsToSchema({
    schema,
    resolvers,
    resolverValidationOptions: {
      allowResolversNotInSchema: true,
    },
  });

  return applySchemaTransforms(schema, transforms);
}

export default function transformSchema(
  schemaOrSchemaExecutionConfig: GraphQLSchema | SchemaExecutionConfig,
  transforms: Array<Transform>,
): GraphQLSchema & { transforms: Array<Transform> } {
  const schema = wrapSchema(schemaOrSchemaExecutionConfig, transforms);
  (schema as any).transforms = transforms.slice().reverse();
  return schema as GraphQLSchema & { transforms: Array<Transform> };
}
