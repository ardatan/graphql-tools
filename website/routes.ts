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
