import { GraphQLDirective, GraphQLFieldConfigArgumentMap } from 'graphql';
import { mergeDeep } from '@graphql-tools/utils';

export function mergeDirectives(directives: Set<GraphQLDirective>) {
  if (directives.size === 0) {
    return undefined;
  }
  if (directives.size === 1) {
    const directive = directives.values().next().value;
    return directive;
  }
  let name: string;
  let description: string;
  const locations = new Set<string>();
  const args: GraphQLFieldConfigArgumentMap = {};
  const extensionsSet = new Set<any>();
  let isRepeatable = false;
  for (const directive of directives) {
    name = directive.name;
    if (directive.description) {
      description = directive.description;
    }
    for (const location of directive.locations) {
      locations.add(location);
    }
    for (const arg of directive.args) {
      args[arg.name] = arg;
    }
    isRepeatable = isRepeatable || directive.isRepeatable;
    if (directive.extensions) {
      extensionsSet.add(directive.extensions);
    }
  }
  return new GraphQLDirective({
    name: name!,
    description: description!,
    locations: Array.from(locations) as any[],
    args,
    isRepeatable,
    extensions: extensionsSet.size > 0 ? mergeDeep([...extensionsSet]) : undefined,
  });
}
