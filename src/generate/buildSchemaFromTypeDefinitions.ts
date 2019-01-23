import {
  parse,
  extendSchema,
  buildASTSchema,
  GraphQLSchema,
  DocumentNode,
} from 'graphql';
import { ITypeDefinitions, GraphQLParseOptions } from '../Interfaces';

import SchemaError from './SchemaError';
import extractExtensionDefinitions from './extractExtensionDefinitions';
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

  const backcompatOptions = { commentDescriptions: true };

  // TODO fix types https://github.com/apollographql/graphql-tools/issues/542
  let schema: GraphQLSchema = (buildASTSchema as any)(
    astDocument,
    backcompatOptions,
  );

  const extensionsAst = extractExtensionDefinitions(astDocument);
  if (extensionsAst.definitions.length > 0) {
    // TODO fix types https://github.com/apollographql/graphql-tools/issues/542
    schema = (extendSchema as any)(schema, extensionsAst, backcompatOptions);
  }

  return schema;
}

function isDocumentNode(
  typeDefinitions: ITypeDefinitions,
): typeDefinitions is DocumentNode {
  return (<DocumentNode>typeDefinitions).kind !== undefined;
}

export default buildSchemaFromTypeDefinitions;
