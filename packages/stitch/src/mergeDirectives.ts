import { DirectiveLocation, GraphQLDirective, GraphQLFieldConfigArgumentMap } from 'graphql';

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
  const locations = new Set<DirectiveLocation>();
  const args: GraphQLFieldConfigArgumentMap = {};
  const extensions: Record<string, any> = {};
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
    isRepeatable = directive.isRepeatable;
    if (directive.extensions) {
      Object.assign(extensions, directive.extensions);
    }
  }
  return new GraphQLDirective({
    name: name!,
    description: description!,
    locations: Array.from(locations),
    args,
    isRepeatable,
    extensions,
  });
}
