import { GraphQLSchema } from 'graphql';

import addResolversToSchema from '../generate/addResolversToSchema';
import { Transform, SubschemaConfig, isSubschemaConfig } from '../Interfaces';
import { cloneSchema } from '../utils/clone';

import { generateProxyingResolvers, stripResolvers } from './resolvers';
import { applySchemaTransforms } from './transforms';

export function wrapSchema(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms?: Array<Transform>,
): GraphQLSchema {
  const subschemaConfig: SubschemaConfig = isSubschemaConfig(
    subschemaOrSubschemaConfig,
  )
    ? subschemaOrSubschemaConfig
    : { schema: subschemaOrSubschemaConfig };

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
