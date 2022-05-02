import loader from '@graphql-tools/webpack-loader';
import { SyncTransformer, TransformOptions } from '@jest/transform';

export type GraphQLGlobalOptions = ThisParameterType<typeof loader>['query'];

declare module '@jest/types' {
  namespace Config {
    interface ConfigGlobals {
      graphql: GraphQLGlobalOptions;
    }
  }
}

class GraphQLTransformer implements SyncTransformer {
  process(input: string, _filePath: string, jestConfig: TransformOptions) {
    const config = jestConfig.config.globals?.['graphql'] || {};
    // call directly the webpack loader with a mocked context
    // as the loader leverages `this.cacheable()`
    return {
      code: loader.call(
        {
          cacheable() {},
          query: config,
        } as any,
        input
      ),
    };
  }
}

let transformer!: GraphQLTransformer;
function defaultTransformer(): GraphQLTransformer {
  return transformer || (transformer = new GraphQLTransformer());
}

export function process(...args: any[]): any {
  return (defaultTransformer().process as any)(...args);
}

const transformerFactory = {
  process,
};

export default transformerFactory;
