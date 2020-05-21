/* eslint-disable import/no-commonjs */
/* eslint-disable import/unambiguous */
module.exports = {
  someSidebar: [
    'introduction',
    'generate-schema',
    'resolvers',
    'resolvers-composition',
    'scalars',
    'mocking',
    'connectors',
    'schema-directives',
    // 'legacy-schema-directives',
    'directive-resolvers',
    'schema-delegation',
    'remote-schemas',
    'schema-wrapping',
    {
      'Schema merging': [
        'merge-typedefs',
        'merge-resolvers',
        'merge-schemas',
      ]
    },
    'schema-stitching',
    'server-setup',
    'schema-loading',
    'documents-loading',
    'graphql-tag-pluck',
    'relay-operation-optimizer',
    {
      'Migration': [
        'migration-from-tools-v5',
        'migration-from-toolkit',
        'migration-from-merge-graphql-schemas'
      ]
    }
  ],
};
