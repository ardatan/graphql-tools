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
      '/docs': '/docs/introduction',
      '/api/modules/:name': '/docs/api/modules/:name\\_src',
      '/docs/legacy-schema-directives': '/docs/schema-directives',
      '/docs/merge-resolvers': '/docs/resolvers',
      '/docs/migration-from-tools-v5': '/docs/migration/migration-from-tools',
      '/docs/graphql-tools/mocking': '/docs/mocking',
      '/docs/schema-transforms': '/docs/schema-wrapping',
      '/docs/merge-typedefs': '/docs/migration/migration-from-merge-graphql-schemas',
      '/install': '/docs/introduction',
      '/docs/api/modules': '/docs/api/modules/batch_delegate_src',
      '/docs/api/modules/merge#mergetypedefs': '/docs/api/modules/merge_src#mergetypedefs',
    }).map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
});
