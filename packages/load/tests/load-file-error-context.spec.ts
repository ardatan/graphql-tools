import { join } from 'path';
import { parse } from 'graphql';
import { loadTypedefs, loadTypedefsSync } from '@graphql-tools/load';
import { Loader, Source } from '@graphql-tools/utils';

describe('loadFile AggregateError context (#7406)', () => {
  const pointer = join(__dirname, 'test-files', 'missing-no-match.graphql');

  const failingLoader: Loader = {
    load: async () => {
      throw new Error('unrelated loader failure');
    },
    loadSync: () => {
      throw new Error('unrelated loader failure');
    },
  };

  it('includes Failed to find any GraphQL type definitions when a single loader errors (async)', async () => {
    await expect(
      loadTypedefs(pointer, {
        loaders: [failingLoader],
      }),
    ).rejects.toThrow(/Failed to find any GraphQL type definitions/);
  });

  it('includes Failed to find any GraphQL type definitions when a single loader errors (sync)', () => {
    expect(() =>
      loadTypedefsSync(pointer, {
        loaders: [failingLoader],
      }),
    ).toThrow(/Failed to find any GraphQL type definitions/);
  });

  it('still returns sources when a loader succeeds despite another failing', async () => {
    const okLoader: Loader = {
      load: async (): Promise<Source[]> => [
        {
          location: pointer,
          document: parse('type Query { ok: String }'),
        },
      ],
      loadSync: (): Source[] => [
        {
          location: pointer,
          document: parse('type Query { ok: String }'),
        },
      ],
    };

    const results = await loadTypedefs(pointer, {
      loaders: [failingLoader, okLoader],
    });
    expect(results.length).toBeGreaterThan(0);
  });
});
