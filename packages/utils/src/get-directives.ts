import { GraphQLSchema } from 'graphql';
import { DirectableObject, getDirectiveExtensions } from './getDirectiveExtensions.js';

export interface DirectiveAnnotation {
  name: string;
  args?: Record<string, any>;
}

export type DirectableGraphQLObject = DirectableObject;

export function getDirectivesInExtensions(
  node: DirectableGraphQLObject,
  pathToDirectivesInExtensions = ['directives'],
): Array<DirectiveAnnotation> {
  const directiveExtensions = getDirectiveExtensions(node, undefined, pathToDirectivesInExtensions);
  return Object.entries(directiveExtensions)
    .map(([directiveName, directiveArgsArr]) =>
      directiveArgsArr?.map(directiveArgs => ({
        name: directiveName,
        args: directiveArgs,
      })),
    )
    .flat(Infinity)
    .filter(Boolean) as Array<DirectiveAnnotation>;
}

export function getDirectiveInExtensions(
  node: DirectableGraphQLObject,
  directiveName: string,
  pathToDirectivesInExtensions = ['directives'],
): Array<Record<string, any>> | undefined {
  const directiveExtensions = getDirectiveExtensions(node, undefined, pathToDirectivesInExtensions);
  return directiveExtensions[directiveName];
}

export function getDirectives(
  schema: GraphQLSchema,
  node: DirectableGraphQLObject,
  pathToDirectivesInExtensions = ['directives'],
): Array<DirectiveAnnotation> {
  const directiveExtensions = getDirectiveExtensions(node, schema, pathToDirectivesInExtensions);
  return Object.entries(directiveExtensions)
    .map(([directiveName, directiveArgsArr]) =>
      directiveArgsArr?.map(directiveArgs => ({
        name: directiveName,
        args: directiveArgs,
      })),
    )
    .flat(Infinity)
    .filter(Boolean) as Array<DirectiveAnnotation>;
}

export function getDirective(
  schema: GraphQLSchema,
  node: DirectableGraphQLObject,
  directiveName: string,
  pathToDirectivesInExtensions = ['directives'],
): Array<Record<string, any>> | undefined {
  const directiveExtensions = getDirectiveExtensions(node, schema, pathToDirectivesInExtensions);
  return directiveExtensions[directiveName];
}
