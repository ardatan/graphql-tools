import { withGuildDocs } from '@theguild/components/next.config';

export default withGuildDocs({
  images: {
    unoptimized: true, // doesn't work with `next export`
  },
  redirects: () =>
    Object.entries({
      '/docs/directive-resolvers': '/docs/schema-directives',
      '/docs/schema-directives-legacy': '/docs/schema-directives',
      '/docs/schema-stitching': '/docs/schema-stitching/stitch-combining-schemas',
      '/docs/stitch-api': '/docs/schema-stitching/stitch-api',
      '/docs/stitch-combining-schemas': '/docs/schema-stitching/stitch-combining-schemas',
      '/docs/stitch-directives-sdl': '/docs/schema-stitching/stitch-directives-sdl',
      '/docs/stitch-schema-extensions': '/docs/schema-stitching/stitch-schema-extensions',
      '/docs/stitch-type-merging': '/docs/schema-stitching/stitch-type-merging',
      '/docs/migration-from-import': '/docs/migration/migration-from-import',
      '/docs/migration-from-merge-graphql-schemas': '/docs/migration/migration-from-merge-graphql-schemas',
      '/docs/migration-from-toolkit': '/docs/migration/migration-from-toolkit',
      '/docs/migration-from-tools': '/docs/migration/migration-from-tools',
    }).map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
});
