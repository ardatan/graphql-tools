import { GraphQLFieldResolver, defaultFieldResolver, GraphQLSchema } from 'graphql';
import { mapSchema, MapperKind } from '@graphql-tools/utils';

function decorateToCatchUndefined(fn: GraphQLFieldResolver<any, any>, hint: string): GraphQLFieldResolver<any, any> {
  const resolve = fn == null ? defaultFieldResolver : fn;
  return (root, args, ctx, info) => {
    const result = resolve(root, args, ctx, info);
    if (typeof result === 'undefined') {
      throw new Error(`Resolver for "${hint}" returned undefined`);
    }
    return result;
  };
}

export function addCatchUndefinedToSchema(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => ({
      ...fieldConfig,
      resolve: decorateToCatchUndefined(fieldConfig.resolve, `${typeName}.${fieldName}`),
    }),
  });
}
