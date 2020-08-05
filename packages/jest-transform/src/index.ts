import loader, { Options } from '@graphql-tools/webpack-loader';
import { Transformer } from '@jest/transform';
import { Config } from '@jest/types';

export interface GraphQLGlobalOptions extends Options {}

declare module '@jest/types' {
  namespace Config {
    interface ConfigGlobals {
      graphql: GraphQLGlobalOptions;
    }
  }
}

class GraphQLTransformer implements Transformer {
  process(input: string, _filePath: Config.Path, jestConfig: Config.ProjectConfig): string {
    const config = jestConfig.globals?.['graphql'] || {};
    // call directly the webpack loader with a mocked context
    // as the loader leverages `this.cacheable()`
    return loader.call(
      {
        cacheable() {},
        query: config,
      },
      input
    );
  }
}

let transformer!: GraphQLTransformer;
function defaultTransformer(): GraphQLTransformer {
  return transformer || (transformer = new GraphQLTransformer());
}

export function process(...args: any[]): any {
  return (defaultTransformer().process as any)(...args);
}
