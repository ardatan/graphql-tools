import loader from '@graphql-tools/webpack-loader';
export declare type GraphQLGlobalOptions = ThisParameterType<typeof loader>['query'];
declare module '@jest/types' {
  namespace Config {
    interface ConfigGlobals {
      graphql: GraphQLGlobalOptions;
    }
  }
}
export declare function process(...args: any[]): any;
