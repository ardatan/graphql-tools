import { parseGraphQLSDL, parseGraphQLJSON } from '@graphql-tools/utils';
/**
 * @internal
 */
export function parse(_a) {
    var path = _a.path, pointer = _a.pointer, content = _a.content, options = _a.options;
    if (/\.(gql|graphql)s?$/i.test(path)) {
        return parseGraphQLSDL(pointer, content, options);
    }
    if (/\.json$/i.test(path)) {
        return parseGraphQLJSON(pointer, content, options);
    }
}
