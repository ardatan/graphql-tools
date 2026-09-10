const path = require('node:path');
const { concatAST } = require('graphql');

const packagePath = process.env.EXTERNAL_FRAGMENT_PACKAGE
  ? require.resolve(process.env.EXTERNAL_FRAGMENT_PACKAGE, { paths: [process.cwd()] })
  : path.resolve(__dirname, '../../dist/cjs/index.js');
const { ExternalFragmentLoader } = require(packagePath);
const loader = new ExternalFragmentLoader();

// Codegen custom loaders must resolve to one DocumentNode or Source. Adapt the
// class loader's async Source[] result into one merged DocumentNode.
module.exports = async function asyncExternalFragmentLoader(pointer, options) {
  const sources = await loader.load(pointer, options);
  return concatAST(sources.flatMap(source => (source.document ? [source.document] : [])));
};
