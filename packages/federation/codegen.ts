import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://uplink.api.apollographql.com',
  generates: {
    'src/generated/apollo-uplink.ts': {
      documents: ['src/managed-federation.ts'],
      plugins: ['typescript', 'typescript-operations'],
    },
  },
};

export default config;
