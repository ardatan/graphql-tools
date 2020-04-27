import {
  parse,
  buildASTSchema,
  GraphQLSchema,
  DocumentNode,
  ASTNode,
} from 'graphql';

import { ITypeDefinitions, GraphQLParseOptions } from '../Interfaces';
import SchemaError from '../utils/SchemaError';

import { extendSchemaWithSubscriptions } from '../utils/extendSchemaWithSubscriptions';

import {
  extractExtensionDefinitions,
  filterExtensionDefinitions,
} from './extensionDefinitions';
import concatenateTypeDefs from './concatenateTypeDefs';

function buildSchemaFromTypeDefinitions(
  typeDefinitions: ITypeDefinitions,
  parseOptions?: GraphQLParseOptions,
): GraphQLSchema {
  // TODO: accept only array here, otherwise interfaces get confusing.
  let myDefinitions = typeDefinitions;
  let astDocument: DocumentNode;

  if (isDocumentNode(typeDefinitions)) {
    astDocument = typeDefinitions;
  } else if (typeof myDefinitions !== 'string') {
    if (!Array.isArray(myDefinitions)) {
      const type = typeof myDefinitions;
      throw new SchemaError(
        `typeDefs must be a string, array or schema AST, got ${type}`,
      );
    }
    myDefinitions = concatenateTypeDefs(myDefinitions);
  }

  if (typeof myDefinitions === 'string') {
    astDocument = parse(myDefinitions, parseOptions);
  }

  const typesAst = filterExtensionDefinitions(astDocument);

  const backcompatOptions = { commentDescriptions: true };
  let schema: GraphQLSchema = buildASTSchema(typesAst, backcompatOptions);

  const extensionsAst = extractExtensionDefinitions(astDocument);
  if (extensionsAst.definitions.length > 0) {
    schema = extendSchemaWithSubscriptions(
      schema,
      extensionsAst,
      backcompatOptions,
    );
  }

  return schema;
}

function isDocumentNode(
  typeDefinitions: ITypeDefinitions,
): typeDefinitions is DocumentNode {
  return (typeDefinitions as ASTNode).kind !== undefined;
}

export default buildSchemaFromTypeDefinitions;
