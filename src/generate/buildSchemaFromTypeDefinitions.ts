import {
  parse,
  extendSchema,
  buildASTSchema,
  GraphQLSchema,
  DocumentNode,
  ASTNode,
} from 'graphql';

import { ITypeDefinitions, GraphQLParseOptions } from '../Interfaces';
import SchemaError from '../utils/SchemaError';

import {
  extractExtensionDefinitions,
  filterExtensionDefinitions,
} from './definitions';
import concatenateTypeDefs from './concatenateTypeDefs';

export default function buildSchemaFromTypeDefinitions(
  typeDefinitions: ITypeDefinitions,
  parseOptions?: GraphQLParseOptions,
): GraphQLSchema {
  const document = buildDocumentFromTypeDefinitions(
    typeDefinitions,
    parseOptions,
  );

  const typesAst = filterExtensionDefinitions(document);

  const backcompatOptions = { commentDescriptions: true };
  let schema: GraphQLSchema = buildASTSchema(typesAst, backcompatOptions);

  const extensionsAst = extractExtensionDefinitions(document);
  if (extensionsAst.definitions.length > 0) {
    schema = extendSchema(schema, extensionsAst, backcompatOptions);
  }

  return schema;
}

function isDocumentNode(
  typeDefinitions: ITypeDefinitions,
): typeDefinitions is DocumentNode {
  return (typeDefinitions as ASTNode).kind !== undefined;
}

export function buildDocumentFromTypeDefinitions(
  typeDefinitions: ITypeDefinitions,
  parseOptions?: GraphQLParseOptions,
): DocumentNode {
  let document: DocumentNode;
  if (typeof typeDefinitions === 'string') {
    document = parse(typeDefinitions, parseOptions);
  } else if (Array.isArray(typeDefinitions)) {
    document = parse(concatenateTypeDefs(typeDefinitions), parseOptions);
  } else if (isDocumentNode(typeDefinitions)) {
    document = typeDefinitions;
  } else {
    const type = typeof typeDefinitions;
    throw new SchemaError(
      `typeDefs must be a string, array or schema AST, got ${type}`,
    );
  }

  return document;
}
