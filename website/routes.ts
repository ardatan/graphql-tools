import { IRoutes, GenerateRoutes } from '@guild-docs/server';
import apiSidebar from './api-sidebar.json';

export function getRoutes(): IRoutes {
  const Routes: IRoutes = {
    _: {
      docs: {
        $name: 'Topics',
        $routes: [
          'introduction',
          'generate-schema',
          'resolvers',
          'resolvers-composition',
          'scalars',
          'mocking',
          'connectors',
          'schema-directives',
          'schema-delegation',
          'remote-schemas',
          'batch-execution',
          'schema-wrapping',
          'schema-merging',
          '$schema-stitching',
          'server-setup',
          'schema-loading',
          'documents-loading',
          'graphql-tag-pluck',
          'relay-operation-optimizer',
          '$migration',
        ],
        _: {
          'schema-stitching': {
            $name: 'Schema Stitching',
            $routes: [
              'stitch-combining-schemas',
              'stitch-type-merging',
              'stitch-directives-sdl',
              'stitch-schema-extensions',
              'stitch-api',
              'stitch-federation',
            ],
          },
          migration: {
            $name: 'Migration',
            $routes: [
              ['migration-from-import', 'Migration from GraphQL Import', 'From GraphQL Import'],
              [
                'migration-from-merge-graphql-schemas',
                'Migration from Merge GraphQL Schemas',
                'From Merge GraphQL Schemas',
              ],
              ['migration-from-toolkit', 'Migration from GraphQL Toolkit', 'From GraphQL Toolkit'],
              ['migration-from-tools', 'Migration to v7', 'From tools v4 - v6'],
            ],
          },
          api: apiSidebar,
        },
      },
    },
  };
  GenerateRoutes({
    Routes,
    folderPattern: 'docs',
    basePath: 'docs',
    basePathLabel: 'Documentation',
  });

  return Routes;
}
