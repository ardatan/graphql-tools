import { MapperKind, mapSchema } from '@graphql-tools/utils';
// If we have any union or interface types throw if no there is no resolveType resolver
export function checkForResolveTypeResolver(schema, requireResolversForResolveType) {
    var _a;
    mapSchema(schema, (_a = {},
        _a[MapperKind.ABSTRACT_TYPE] = function (type) {
            if (!type.resolveType) {
                var message = "Type \"" + type.name + "\" is missing a \"__resolveType\" resolver. Pass 'ignore' into " +
                    '"resolverValidationOptions.requireResolversForResolveType" to disable this error.';
                if (requireResolversForResolveType === 'error') {
                    throw new Error(message);
                }
                if (requireResolversForResolveType === 'warn') {
                    // eslint-disable-next-line no-console
                    console.warn(message);
                }
            }
            return undefined;
        },
        _a));
}
