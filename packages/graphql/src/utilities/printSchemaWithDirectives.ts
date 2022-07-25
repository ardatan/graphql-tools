import { print } from '../language';
import { GraphQLSchema } from '../type';
import { getDocumentNodeFromSchema } from './getDocumentNodeFromSchema';

interface PrintSchemaWithDirectivesOptions {
  /**
   * Descriptions are defined as preceding string literals, however an older
   * experimental version of the SDL supported preceding comments as
   * descriptions. Set to true to enable this deprecated behavior.
   * This option is provided to ease adoption and will be removed in v16.
   *
   * Default: false
   */
  commentDescriptions?: boolean;
  assumeValid?: boolean;
  pathToDirectivesInExtensions?: Array<string>;
}

// this approach uses the default schema printer rather than a custom solution, so may be more backwards compatible
// currently does not allow customization of printSchema options having to do with comments.
export function printSchemaWithDirectives(
  schema: GraphQLSchema,
  options: PrintSchemaWithDirectivesOptions = {}
): string {
  const documentNode = getDocumentNodeFromSchema(schema, options);
  return print(documentNode);
}
