import { defaultFieldResolver } from 'graphql';
export function chainResolvers(resolvers) {
    return function (root, args, ctx, info) {
        return resolvers.reduce(function (prev, curResolver) {
            if (curResolver != null) {
                return curResolver(prev, args, ctx, info);
            }
            return defaultFieldResolver(prev, args, ctx, info);
        }, root);
    };
}
