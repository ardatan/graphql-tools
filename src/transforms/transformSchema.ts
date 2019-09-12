import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLUnionType,
} from 'graphql';
import { addResolveFunctionsToSchema } from '../makeExecutableSchema';

import { Transform, applySchemaTransforms } from '../transforms/transforms';
import {
  generateProxyingResolvers,
  generateSimpleMapping,
} from '../stitching/resolvers';
import {
  SchemaExecutionConfig,
  isSchemaExecutionConfig,
} from '../Interfaces';
import resolveFromParentTypename from '../stitching/resolveFromParentTypename';
import { defaultMergedResolver } from '../stitching';
import { cloneSchema } from '../utils/cloneSchema';

export function stripResolvers(schema: GraphQLSchema): void {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach(typeName => {
    if (typeName.startsWith('__')) {
      return;
    }

    const type = typeMap[typeName];
    if (type instanceof GraphQLObjectType) {
      type.isTypeOf = undefined;

      const fieldMap = type.getFields();
      Object.keys(fieldMap).forEach(fieldName => {
        fieldMap[fieldName].resolve = defaultMergedResolver;
        fieldMap[fieldName].subscribe = null;
      });
    } else if (type instanceof GraphQLInterfaceType || type instanceof GraphQLUnionType) {
      type.resolveType = (parent, context, info) => resolveFromParentTypename(parent, info.schema);
    }
  });
}

export function wrapSchema(
  schemaOrSchemaExecutionConfig: GraphQLSchema | SchemaExecutionConfig,
  transforms: Array<Transform>,
): GraphQLSchema {
  const targetSchema: GraphQLSchema = isSchemaExecutionConfig(schemaOrSchemaExecutionConfig) ?
    schemaOrSchemaExecutionConfig.schema : schemaOrSchemaExecutionConfig;

  const schema = cloneSchema(targetSchema);
  stripResolvers(schema);

  const mapping = generateSimpleMapping(targetSchema);
  const resolvers = generateProxyingResolvers(
    schemaOrSchemaExecutionConfig,
    transforms,
    mapping,
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
  (schema as any).transforms = transforms;
  return schema as GraphQLSchema & { transforms: Array<Transform> };
}
