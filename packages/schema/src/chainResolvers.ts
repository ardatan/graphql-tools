import { defaultFieldResolver, GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql';

export function chainResolvers<TArgs extends { [argName: string]: any }>(resolvers: Array<GraphQLFieldResolver<any, any, TArgs>>) {
  return (root: any, args: TArgs, ctx: any, info: GraphQLResolveInfo) =>
    resolvers.reduce((prev, curResolver) => {
      if (curResolver != null) {
        return curResolver(prev, args, ctx, info);
      }

      return defaultFieldResolver(prev, args, ctx, info);
    }, root);
}
