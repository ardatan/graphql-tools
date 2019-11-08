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
  subschema: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform> = [],
): GraphQLSchema {
  if (isSubschemaConfig(subschema)) {
    if (transforms) {
      subschema.transforms = (subschema.transforms || []).concat(transforms);
    }
  } else {
    subschema = {
      schema: subschema,
      transforms,
    };
  }

  const schema = cloneSchema(subschema.schema);
  stripResolvers(schema);

  addResolveFunctionsToSchema({
    schema,
    resolvers: generateProxyingResolvers(subschema),
    resolverValidationOptions: {
      allowResolversNotInSchema: true,
    },
  });

  return applySchemaTransforms(schema, subschema.transforms);
}

export default function transformSchema(
  subschema: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform>,
): GraphQLSchema & { transforms: Array<Transform> } {
  const schema = wrapSchema(subschema, transforms);
  (schema as any).transforms = transforms.slice().reverse();
  return schema as GraphQLSchema & { transforms: Array<Transform> };
}
