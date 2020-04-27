import { GraphQLFieldResolver, defaultFieldResolver, GraphQLSchema } from 'graphql';
import { forEachField } from '../utils/forEachField';

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

export function addCatchUndefinedToSchema(schema: GraphQLSchema): void {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}
