import { GraphQLResolveInfo } from 'graphql';

export function fieldShouldStream(info: GraphQLResolveInfo): boolean {
  const directives = info.fieldNodes[0]?.directives;
  return directives !== undefined && directives.some(directive => directive.name.value === 'stream');
}
