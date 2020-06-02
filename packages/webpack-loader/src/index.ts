import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from 'packages/graphql-tools/src';
import { concatAST } from 'graphql';

export default function (this: any, path: string) {
  const callback = this.async();

  this.cacheable();

  loadTypedefs(path, {
    loaders: [new GraphQLFileLoader()],
  }).then(sources => {
    const documents = sources.map(source => source.document);
    const mergedDoc = concatAST(documents);
    return callback(null, `module.exports = ${JSON.stringify(mergedDoc)}`);
  });
}
