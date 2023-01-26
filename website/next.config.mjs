import { withGuildDocs } from '@theguild/components/next.config';

export default withGuildDocs({
  images: {
    unoptimized: true, // doesn't work with `next export`
  },
  redirects: () =>
    Object.entries({
      '/docs/directive-resolvers': '/docs/schema-directives',
      '/docs/schema-directives-legacy': '/docs/schema-directives',
      '/docs/schema-stitching': 'https://the-guild.dev/graphql/stitching',
      '/docs/stitch-api': 'https://the-guild.dev/graphql/stitching',
      '/docs/stitch-combining-schemas': 'https://the-guild.dev/graphql/stitching/docs/approaches',
      '/docs/stitch-directives-sdl': 'https://the-guild.dev/graphql/stitching/docs/approaches/stitching-directives',
      '/docs/stitch-schema-extensions': 'https://the-guild.dev/graphql/stitching/docs/approaches/schema-extensions',
      '/docs/stitch-type-merging': 'https://the-guild.dev/graphql/stitching/docs/approaches/type-merging',
      '/docs/schema-stitching/stitch-api': 'https://the-guild.dev/graphql/stitching',
      '/docs/schema-stitching/stitch-combining-schemas': 'https://3274ca7d.schema-stitching.pages.dev/docs/approaches',
      '/docs/schema-stitching/stitch-directives-sdl':
        'https://the-guild.dev/graphql/stitching/docs/approaches/stitching-directives',
      '/docs/schema-stitching/stitch-schema-extensions':
        'https://the-guild.dev/graphql/stitching/docs/approaches/schema-extensions',
      '/docs/schema-stitching/stitch-type-merging':
        'https://the-guild.dev/graphql/stitching/docs/approaches/type-merging',
      '/docs/schema-stitching/stitch-federation':
        'https://the-guild.dev/graphql/stitching/handbook/other-integrations/federation-services',
      '/docs/schema-transforms': 'https://the-guild.dev/graphql/stitching/docs/getting-started/adding-transforms',
      '/docs/batch-execution':
        'https://the-guild.dev/graphql/stitching/docs/getting-started/remote-subschemas#batch-execution',
      '/docs/remote-schemas': 'https://the-guild.dev/graphql/stitching/docs/getting-started/remote-subschemas',
      '/docs/schema-delegation':
        'https://the-guild.dev/graphql/stitching/docs/approaches/schema-extensions#schema-delegation',
      '/docs/schema-wrapping': 'https://the-guild.dev/graphql/stitching/docs/transforms',
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
