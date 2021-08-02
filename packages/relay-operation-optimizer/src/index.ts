import { printSchemaWithDirectives, SchemaPrintOptions } from '@graphql-tools/utils';
import { parse, GraphQLSchema, DefinitionNode, DocumentNode, ParseOptions, concatAST } from 'graphql';

import { transform as skipRedundantNodesTransform } from 'relay-compiler/lib/transforms/SkipRedundantNodesTransform.js';
import { transform as inlineFragmentsTransform } from 'relay-compiler/lib/transforms/InlineFragmentsTransform.js';
import { transform as applyFragmentArgumentTransform } from 'relay-compiler/lib/transforms/ApplyFragmentArgumentTransform.js';
import { transformWithOptions as flattenTransformWithOptions } from 'relay-compiler/lib/transforms/FlattenTransform.js';
import CompilerContext from 'relay-compiler/lib/core/CompilerContext.js';
import { transform as relayTransform } from 'relay-compiler/lib/core/RelayParser.js';
import { print as relayPrint } from 'relay-compiler/lib/core/IRPrinter.js';
import { create as relayCreate } from 'relay-compiler/lib/core/Schema.js';

export type OptimizeDocumentsOptions = SchemaPrintOptions &
  ParseOptions & {
    includeFragments?: boolean;
  };

export function optimizeDocuments(
  schema: GraphQLSchema,
  documents: DocumentNode[],
  options: OptimizeDocumentsOptions = {}
) {
  options = {
    noLocation: true,
    ...options,
  };
  // @TODO way for users to define directives they use, otherwise relay will throw an unknown directive error
  // Maybe we can scan the queries and add them dynamically without users having to do some extra stuff
  // transformASTSchema creates a new schema instance instead of mutating the old one
  const adjustedSchema = relayCreate(printSchemaWithDirectives(schema, options));

  const documentAsts = concatAST(documents);

  const relayDocuments = relayTransform(adjustedSchema, documentAsts.definitions as DefinitionNode[]);

  const result: DocumentNode[] = [];

  if (options.includeFragments) {
    const fragmentCompilerContext = new CompilerContext(adjustedSchema)
      .addAll(relayDocuments)
      .applyTransforms([
        applyFragmentArgumentTransform,
        flattenTransformWithOptions({ flattenAbstractTypes: false }),
        skipRedundantNodesTransform,
      ]);

    result.push(
      ...fragmentCompilerContext
        .documents()
        .filter(doc => doc.kind === 'Fragment')
        .map(doc => parse(relayPrint(adjustedSchema, doc), options))
    );
  }

  const queryCompilerContext = new CompilerContext(adjustedSchema)
    .addAll(relayDocuments)
    .applyTransforms([
      applyFragmentArgumentTransform,
      inlineFragmentsTransform,
      flattenTransformWithOptions({ flattenAbstractTypes: false }),
      skipRedundantNodesTransform,
    ]);

  result.push(...queryCompilerContext.documents().map(doc => parse(relayPrint(adjustedSchema, doc), options)));

  return result;
}
