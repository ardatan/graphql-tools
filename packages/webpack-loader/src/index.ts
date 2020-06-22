import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { concatAST } from 'graphql';
import { getOptions } from 'loader-utils';

export default function (this: any, path: string) {
  const callback = this.async();

  this.cacheable();

  const options = getOptions(this);

  loadTypedefs(path, {
    loaders: [new GraphQLFileLoader()],
    noLocation: true,
    ...options,
  }).then(sources => {
    const documents = sources.map(source => source.document);
    const mergedDoc = concatAST(documents);
    return callback(null, `export default ${JSON.stringify(mergedDoc)}`);
  });
}
