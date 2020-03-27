import {
  defaultFieldResolver,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
} from 'graphql';

export function chainResolvers(
  resolvers: Array<GraphQLFieldResolver<any, any>>,
) {
  return (
    root: any,
    args: { [argName: string]: any },
    ctx: any,
    info: GraphQLResolveInfo,
  ) =>
    resolvers.reduce((prev, curResolver) => {
      if (curResolver != null) {
        return curResolver(prev, args, ctx, info);
      }

      return defaultFieldResolver(prev, args, ctx, info);
    }, root);
}
