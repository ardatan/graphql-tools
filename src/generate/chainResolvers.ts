import { defaultFieldResolver, GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql';

export function chainResolvers(resolvers: GraphQLFieldResolver<any, any>[]) {
  return (root: any, args: { [argName: string]: any }, ctx: any, info: GraphQLResolveInfo) => {
    return resolvers.reduce((prev, curResolver) => {
      if (curResolver) {
        return curResolver(prev, args, ctx, info);
      }

      return defaultFieldResolver(prev, args, ctx, info);
    }, root);
  };
}
