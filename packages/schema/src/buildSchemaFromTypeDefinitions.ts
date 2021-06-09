import { extendSchema, buildASTSchema, GraphQLSchema, DocumentNode } from 'graphql';

import { ITypeDefinitions, GraphQLParseOptions, parseGraphQLSDL, isDocumentNode } from '@graphql-tools/utils';

import { filterAndExtractExtensionDefinitions } from './extensionDefinitions';
import { concatenateTypeDefs } from './concatenateTypeDefs';

export function buildSchemaFromTypeDefinitions(
  typeDefinitions: ITypeDefinitions,
  parseOptions?: GraphQLParseOptions,
  noExtensionExtraction?: boolean,
  assumeValidSchema?: boolean
): GraphQLSchema {
  const document = buildDocumentFromTypeDefinitions(typeDefinitions, parseOptions);

  if (noExtensionExtraction) {
    return buildASTSchema(document, { assumeValid: assumeValidSchema });
  }

  const { typesAst, extensionsAst } = filterAndExtractExtensionDefinitions(document);

  const buildAstOptions = { assumeValid: assumeValidSchema, commentDescriptions: true };
  let schema: GraphQLSchema = buildASTSchema(typesAst, buildAstOptions);

  if (extensionsAst.definitions.length > 0) {
    schema = extendSchema(schema, extensionsAst, buildAstOptions);
  }

  return schema;
}

export function buildDocumentFromTypeDefinitions(
  typeDefinitions: ITypeDefinitions,
  parseOptions?: GraphQLParseOptions
): DocumentNode {
  let document: DocumentNode;
  if (typeof typeDefinitions === 'string') {
    document = parseGraphQLSDL('', typeDefinitions, parseOptions).document;
  } else if (Array.isArray(typeDefinitions)) {
    document = parseGraphQLSDL('', concatenateTypeDefs(typeDefinitions), parseOptions).document;
  } else if (isDocumentNode(typeDefinitions)) {
    document = typeDefinitions;
  } else {
    const type = typeof typeDefinitions;
    throw new Error(`typeDefs must be a string, array or schema AST, got ${type}`);
  }

  return document;
}
