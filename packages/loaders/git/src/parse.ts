import { parseGraphQLSDL, parseGraphQLJSON, Source, GraphQLParseOptions } from '@graphql-tools/utils';

/**
 * @internal
 */
export function parse<T extends GraphQLParseOptions>({
  path,
  pointer,
  content,
  options,
}: {
  path: string;
  pointer: string;
  content: string;
  options: T;
}): Source | void {
  if (/\.(gql|graphql)s?$/i.test(path)) {
    return parseGraphQLSDL(pointer, content, options);
  }

  if (/\.json$/i.test(path)) {
    return parseGraphQLJSON(pointer, content, options);
  }
}
