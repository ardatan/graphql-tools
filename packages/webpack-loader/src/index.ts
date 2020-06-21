import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { concatAST } from 'graphql';

export default function (this: any, path: string) {
  const callback = this.async();

  this.cacheable();

  loadTypedefs(path, {
    loaders: [new GraphQLFileLoader()],
    noLocation: true,
  }).then(sources => {
    const documents = sources.map(source => source.document);
    const mergedDoc = concatAST(documents);
    return callback(null, `module.exports = ${JSON.stringify(mergedDoc)}`);
  });
}
