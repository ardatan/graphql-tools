const { register } = require('esbuild-register/dist/node');

register({
  extensions: ['.ts', '.tsx'],
});

const { i18n } = require('./next-i18next.config');

const { withGuildDocs } = require('@guild-docs/server');

const { getRoutes } = require('./routes.ts');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const config = withBundleAnalyzer(
  withGuildDocs({
    i18n,
    getRoutes,
    eslint: {
      ignoreDuringBuilds: true,
    },
  })
);

module.exports = {
  ...config,
  async redirects() {
    const existingRedirects = config.redirects ? await config.redirects() : [];
    return [
      ...existingRedirects,
      {
        source: '/docs/directive-resolvers',
        destination: '/docs/schema-directives',
        permanent: true,
      },
      {
        source: '/docs/schema-directives-legacy',
        destination: '/docs/schema-directives',
        permanent: true,
      },
      {
        source: '/docs/schema-stitching',
        destination: '/docs/schema-stitching/stitch-combining-schemas',
        permanent: true,
      },
      {
        source: '/docs/stitch-api',
        destination: '/docs/schema-stitching/stitch-api',
        permanent: true,
      },
      {
        source: '/docs/stitch-combining-schemas',
        destination: '/docs/schema-stitching/stitch-combining-schemas',
        permanent: true,
      },
      {
        source: '/docs/stitch-directives-sdl',
        destination: '/docs/schema-stitching/stitch-directives-sdl',
        permanent: true,
      },
      {
        source: '/docs/stitch-schema-extensions',
        destination: '/docs/schema-stitching/stitch-schema-extensions',
        permanent: true,
      },
      {
        source: '/docs/stitch-type-merging',
        destination: '/docs/schema-stitching/stitch-type-merging',
        permanent: true,
      },
      {
        source: '/docs/migration-from-import',
        destination: '/docs/migration/migration-from-import',
        permanent: true,
      },
      {
        source: '/docs/migration-from-merge-graphql-schemas',
        destination: '/docs/migration/migration-from-merge-graphql-schemas',
        permanent: true,
      },
      {
        source: '/docs/migration-from-toolkit',
        destination: '/docs/migration/migration-from-toolkit',
        permanent: true,
      },
      {
        source: '/docs/migration-from-tools',
        destination: '/docs/migration/migration-from-tools',
        permanent: true,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
