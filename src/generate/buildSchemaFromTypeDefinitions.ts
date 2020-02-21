import {
  parse,
  extendSchema,
  buildASTSchema,
  GraphQLSchema,
  DocumentNode,
} from 'graphql';
import { ITypeDefinitions, GraphQLParseOptions } from '../Interfaces';

import {
  extractExtensionDefinitions,
  concatenateTypeDefs,
  SchemaError,
} from '.';
import filterExtensionDefinitions from './filterExtensionDefinitions';

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
  const typesAst = filterExtensionDefinitions(astDocument);

  // TODO fix types https://github.com/apollographql/graphql-tools/issues/542
  let schema: GraphQLSchema = (buildASTSchema as any)(
    typesAst,
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
