import { extendSchema, buildASTSchema, GraphQLSchema, DocumentNode, ASTNode } from 'graphql';

import { ITypeDefinitions, GraphQLParseOptions, parseGraphQLSDL } from '@graphql-tools/utils';

import { extractExtensionDefinitions, filterExtensionDefinitions } from './extensionDefinitions';
import { concatenateTypeDefs } from './concatenateTypeDefs';

export function buildSchemaFromTypeDefinitions(
  typeDefinitions: ITypeDefinitions,
  parseOptions?: GraphQLParseOptions
): GraphQLSchema {
  const document = buildDocumentFromTypeDefinitions(typeDefinitions, parseOptions);
  const typesAst = filterExtensionDefinitions(document);

  const backcompatOptions = { commentDescriptions: true };
  let schema: GraphQLSchema = buildASTSchema(typesAst, backcompatOptions);

  const extensionsAst = extractExtensionDefinitions(document);
  if (extensionsAst.definitions.length > 0) {
    schema = extendSchema(schema, extensionsAst, backcompatOptions);
  }

  return schema;
}

export function isDocumentNode(typeDefinitions: ITypeDefinitions): typeDefinitions is DocumentNode {
  return (typeDefinitions as ASTNode).kind !== undefined;
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
