import { GraphQLSchema } from 'graphql';
import { addResolveFunctionsToSchema } from '../makeExecutableSchema';

import { Transform, applySchemaTransforms } from '../transforms/transforms';
import {
  generateProxyingResolvers,
  stripResolvers,
} from '../stitching/resolvers';
import {
  SubschemaConfig,
  isSubschemaConfig,
} from '../Interfaces';

import { cloneSchema } from '../utils/clone';

export function wrapSchema(
  schemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform> = [],
): GraphQLSchema {
  let subschemaConfig: SubschemaConfig;
  if (isSubschemaConfig(schemaOrSubschemaConfig)) {
    subschemaConfig = {
      ...schemaOrSubschemaConfig,
      transforms: (schemaOrSubschemaConfig.transforms || []).concat(transforms),
    };
  } else {
    subschemaConfig = {
      schema: schemaOrSubschemaConfig,
      transforms,
    };
  }

  const schema = cloneSchema(subschemaConfig.schema);
  stripResolvers(schema);

  addResolveFunctionsToSchema({
    schema,
    resolvers: generateProxyingResolvers(subschemaConfig),
    resolverValidationOptions: {
      allowResolversNotInSchema: true,
    },
  });

  return applySchemaTransforms(schema, subschemaConfig.transforms);
}

export default function transformSchema(
  schemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform>,
): GraphQLSchema & { transforms: Array<Transform> } {
  const schema = wrapSchema(schemaOrSubschemaConfig, transforms);
  (schema as any).transforms = transforms.slice().reverse();
  return schema as GraphQLSchema & { transforms: Array<Transform> };
}
