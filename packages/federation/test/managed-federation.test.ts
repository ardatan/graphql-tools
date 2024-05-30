import { Response } from '@whatwg-node/fetch';
import { fetchSupergraphSdlFromManagedFederation } from '../src/managed-federation';

describe('Managed Federation', () => {
  it('should fetch the supergraph SDL from GraphOS', async () => {
    const result = await fetchSupergraphSdlFromManagedFederation({
      apiKey: 'service:Spotify-Demo-Graph-nsqe3n:lI9CbSijTrUb5injfcVMfw',
      graphId: 'Spotify-Demo-Graph-nsqe3n',
    });
    expect(result).toMatchObject({
      supergraphSdl: expect.any(String),
    });
  });

  it('should pass the variables correctly to the fetch function', async () => {
    await fetchSupergraphSdlFromManagedFederation({
      apiKey: 'test-api-key',
      graphId: 'test-graph-id',
      lastSeenId: 'test-last-seen-id',
      upLink: 'test-up-link',
      fetch(url, bodyInit) {
        expect(url).toBe('test-up-link');
        expect(bodyInit?.body).toContain('"lastSeenId":"test-last-seen-id"');
        expect(bodyInit?.body).toContain('"graphId":"test-graph-id"');
        expect(bodyInit?.body).toContain('"apiKey":"test-api-key"');
        return Response.json({
          data: {
            routerConfig: {
              __typename: 'RouterConfigResult',
              minDelaySeconds: 10,
              id: 'test-id-1',
              supergraphSdl: 'test supergraph sdl',
            },
          },
        });
      },
    });

    expect.assertions(4);
  });

  it('should handle unchanged supergraph SDL', async () => {
    const mochUnchangedSuppergraph = () =>
      Response.json({
        data: {
          routerConfig: {
            __typename: 'Unchanged',
            minDelaySeconds: 10,
            id: 'test-id-1',
          },
        },
      });

    const result = await fetchSupergraphSdlFromManagedFederation({
      apiKey: 'service:fake-key',
      graphId: 'Spotify-Demo-Graph-nsqe3n',
      fetch: mochUnchangedSuppergraph,
    });

    expect(result).toMatchObject({
      id: 'test-id-1',
      minDelaySeconds: 10,
    });
  });

  it('should handle fetch errors returned by GraphOS', async () => {
    const mochUnchangedSuppergraph = () =>
      Response.json({
        data: {
          routerConfig: {
            __typename: 'FetchError',
            minDelaySeconds: 10,
            code: 'FETCH_ERROR',
            message: 'Test error message',
          },
        },
      });

    const result = await fetchSupergraphSdlFromManagedFederation({
      apiKey: 'service:fake-key',
      graphId: 'Spotify-Demo-Graph-nsqe3n',
      fetch: mochUnchangedSuppergraph,
    });

    expect(result).toMatchObject({
      minDelaySeconds: 10,
      error: { code: 'FETCH_ERROR', message: 'Test error message' },
    });
  });

  it('should return the supergraph SDL with metadata', async () => {
    const mochUnchangedSuppergraph = () =>
      Response.json({
        data: {
          routerConfig: {
            __typename: 'RouterConfigResult',
            minDelaySeconds: 10,
            id: 'test-id-1',
            supergraphSdl: 'test supergraph sdl',
          },
        },
      });

    const result = await fetchSupergraphSdlFromManagedFederation({
      apiKey: 'service:fake-key',
      graphId: 'Spotify-Demo-Graph-nsqe3n',
      fetch: mochUnchangedSuppergraph,
    });

    expect(result).toMatchObject({
      supergraphSdl: 'test supergraph sdl',
      id: 'test-id-1',
      minDelaySeconds: 10,
    });
  });
});
