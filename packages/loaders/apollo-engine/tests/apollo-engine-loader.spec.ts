import { ApolloEngineLoader, SCHEMA_QUERY } from '../src/index.js';

describe('ApolloEngineLoader', () => {
  test('includes operationName in the request body', () => {
    const loader = new ApolloEngineLoader();
    const [, init] = loader['getFetchArgs']({
      engine: {
        apiKey: 'service:example:key',
      },
      graph: 'my-graph',
      variant: 'current',
    });

    const body = JSON.parse(init.body as string);

    expect(body).toEqual({
      query: SCHEMA_QUERY,
      variables: {
        id: 'my-graph',
        tag: 'current',
      },
      operationName: 'GetSchemaByTag',
    });
  });
});
