/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable spaced-comment */

///<reference path="declarations.d.ts" />

import { concatAST } from 'graphql';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefsSync } from '@graphql-tools/load';
import { isSome } from '@graphql-tools/utils';

const VALID_EXTENSIONS = ['graphql', 'graphqls', 'gql', 'gqls'];

export function handleModule(m: NodeModule, filename: string) {
  const sources = loadTypedefsSync(filename, {
    loaders: [new GraphQLFileLoader()],
  });

  const documents = sources.map(source => source.document).filter(isSome);
  const mergedDoc = concatAST(documents);
  m.exports = mergedDoc;
}

export function registerGraphQLExtensions(nodeRequire: NodeRequire) {
  for (const ext of VALID_EXTENSIONS) {
    nodeRequire.extensions[`.${ext}`] = handleModule;
  }
}

registerGraphQLExtensions(require);
