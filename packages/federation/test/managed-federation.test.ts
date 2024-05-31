import { Response } from '@whatwg-node/fetch';
import { fetchSupergraphSdlFromManagedFederation } from '../src/managed-federation';

describe('Managed Federation', () => {
  // Skipped for the CI, you can run it locally to verify it actually works against GraphOS API
  it.skip('should fetch the supergraph SDL from GraphOS', async () => {
    const result = await fetchSupergraphSdlFromManagedFederation({
      apiKey: process.env['GRAPHOS_API_KEY']!,
      graphRef: process.env['GRAPHOS_GRAPH_ID']!,
    });
    expect(result).toMatchObject({
      supergraphSdl: expect.any(String),
      id: expect.any(String),
      minDelaySeconds: expect.any(Number),
    });
  });

  it('should pass the variables correctly to the fetch function', async () => {
    await fetchSupergraphSdlFromManagedFederation({
      apiKey: 'test-api-key',
      graphRef: 'test-graph-id',
      lastSeenId: 'test-last-seen-id',
      upLink: 'test-up-link',
      fetch(url, bodyInit) {
        expect(url).toBe('test-up-link');
        expect(bodyInit?.body).toContain('"lastSeenId":"test-last-seen-id"');
        expect(bodyInit?.body).toContain('"graphRef":"test-graph-id"');
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
    const mockUnchangedSuppergraph = () =>
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
      graphRef: 'test-id-1',
      fetch: mockUnchangedSuppergraph,
    });

    expect(result).toMatchObject({
      id: 'test-id-1',
      minDelaySeconds: 10,
    });
  });

  it('should handle fetch errors returned by GraphOS', async () => {
    const mockUnchangedSuppergraph = () =>
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
      graphRef: 'test-id-1',
      fetch: mockUnchangedSuppergraph,
    });

    expect(result).toMatchObject({
      minDelaySeconds: 10,
      error: { code: 'FETCH_ERROR', message: 'Test error message' },
    });
  });

  it('should return the supergraph SDL with metadata', async () => {
    const mockUnchangedSuppergraph = () =>
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
      graphRef: 'test-id-1',
      fetch: mockUnchangedSuppergraph,
    });

    expect(result).toMatchObject({
      supergraphSdl: 'test supergraph sdl',
      id: 'test-id-1',
      minDelaySeconds: 10,
    });
  });
});
