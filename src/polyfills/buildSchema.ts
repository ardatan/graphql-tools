import { Source, buildASTSchema, parse, BuildSchemaOptions } from 'graphql';

// polyfill for graphql prior to v13 which do not pass options to buildASTSchema
export function buildSchema(
  ast: string | Source,
  buildSchemaOptions: BuildSchemaOptions,
) {
  return buildASTSchema(parse(ast), buildSchemaOptions);
}
