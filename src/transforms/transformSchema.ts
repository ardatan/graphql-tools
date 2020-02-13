import { addResolversToSchema } from '../makeExecutableSchema';
import { Transform, applySchemaTransforms } from '../transforms/transforms';
import {
  generateProxyingResolvers,
  stripResolvers,
} from '../stitching/resolvers';
import {
  SubschemaConfig,
  isSubschemaConfig,
  GraphQLSchemaWithTransforms,
} from '../Interfaces';

import { cloneSchema } from '../utils/clone';

import { GraphQLSchema } from 'graphql';

export function wrapSchema(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms?: Array<Transform>,
): GraphQLSchema {
  const subschemaConfig: SubschemaConfig = isSubschemaConfig(subschemaOrSubschemaConfig) ?
    subschemaOrSubschemaConfig :
    { schema: subschemaOrSubschemaConfig };

  const schema = cloneSchema(subschemaConfig.schema);
  stripResolvers(schema);

  addResolversToSchema({
    schema,
    resolvers: generateProxyingResolvers({ subschemaConfig, transforms }),
    resolverValidationOptions: {
      allowResolversNotInSchema: true,
    },
  });

  let schemaTransforms: Array<Transform> = [];
  if (subschemaConfig.transforms != null) {
    schemaTransforms = schemaTransforms.concat(subschemaConfig.transforms);
  }
  if (transforms != null) {
    schemaTransforms = schemaTransforms.concat(transforms);
  }

  return applySchemaTransforms(schema, schemaTransforms);
}

export default function transformSchema(
  subschema: GraphQLSchema,
  transforms: Array<Transform>,
): GraphQLSchemaWithTransforms {
  const schema: GraphQLSchemaWithTransforms = wrapSchema({
    schema: subschema,
    transforms,
  });

  schema.transforms = transforms.slice().reverse();
  return schema;
}
