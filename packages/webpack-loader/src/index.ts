import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { parse } from 'graphql';

export default function (this: any, path: string) {
  const callback = this.async();

  this.cacheable();

  loadTypedefs(path, {
    loaders: [new GraphQLFileLoader()],
  }).then(sources => {
    const documentStrs = sources.map(source => source.rawSDL).join('\n');
    const mergedDoc = parse(documentStrs, { noLocation: true });
    return callback(null, `module.exports = ${JSON.stringify(mergedDoc)}`);
  });
}
