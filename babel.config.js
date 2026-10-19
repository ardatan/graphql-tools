module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: process.versions.node.split('.')[0] } }],
    // Babel 8 defaults onlyRemoveTypeImports to true; keep Babel 7-style elision
    // so type-only value imports (e.g. TypedDocumentNode) are stripped at runtime.
    ['@babel/preset-typescript', { onlyRemoveTypeImports: false }],
  ],
  plugins: [
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-explicit-resource-management',
    '@babel/plugin-transform-class-static-block',
    '@babel/plugin-transform-private-methods',
  ],
};
