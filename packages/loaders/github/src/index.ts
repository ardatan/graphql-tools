import { Loader, parseGraphQLSDL, parseGraphQLJSON, BaseLoaderOptions, Source } from '@graphql-tools/utils';
import { GraphQLTagPluckOptions, gqlPluckFromCodeStringSync } from '@graphql-tools/graphql-tag-pluck';
import { parse } from 'graphql';
import syncFetch from '@ardatan/sync-fetch';
import { fetch as asyncFetch } from '@whatwg-node/fetch';
import { AsyncFetchFn, FetchFn, SyncFetchFn } from '@graphql-tools/executor-http';
import { ValueOrPromise } from 'value-or-promise';

// github:owner/name#ref:path/to/file
function extractData(pointer: string): {
  owner: string;
  name: string;
  ref: string;
  path: string;
} {
  const [repo, file] = pointer.split('#');
  const [owner, name] = repo.split(':')[1].split('/');
  const [ref, path] = file.split(':');

  return {
    owner,
    name,
    ref,
    path,
  };
}

/**
 * Additional options for loading from GitHub
 */
export interface GithubLoaderOptions extends BaseLoaderOptions {
  /**
   * A GitHub access token
   */
  token?: string;
  /**
   * Additional options to pass to `graphql-tag-pluck`
   */
  pluckConfig?: GraphQLTagPluckOptions;
  customFetch?: FetchFn;
}

/**
 * This loader loads a file from GitHub.
 *
 * ```js
 * const typeDefs = await loadTypedefs('github:githubUser/githubRepo#branchName:path/to/file.ts', {
 *   loaders: [new GithubLoader()],
 *   token: YOUR_GITHUB_TOKEN,
 * })
 * ```
 */
export class GithubLoader implements Loader<GithubLoaderOptions> {
  async canLoad(pointer: string) {
    return this.canLoadSync(pointer);
  }

  canLoadSync(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('github:');
  }

  loadSyncOrAsync(pointer: string, options: GithubLoaderOptions, asyncFetchFn: AsyncFetchFn): Promise<Source[]>;
  loadSyncOrAsync(pointer: string, options: GithubLoaderOptions, syncFetchFn: SyncFetchFn): Source[];
  loadSyncOrAsync(pointer: string, options: GithubLoaderOptions, fetchFn: FetchFn): Promise<Source[]> | Source[] {
    if (!this.canLoadSync(pointer)) {
      return [];
    }
    const { owner, name, ref, path } = extractData(pointer);
    return new ValueOrPromise(() =>
      fetchFn('https://api.github.com/graphql', this.prepareRequest({ owner, ref, path, name, options }))
    )
      .then(response => {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return response.json();
        } else {
          return response.text();
        }
      })
      .then(response => {
        const status = response.status;
        return this.handleResponse({ pointer, path, options, response, status });
      })
      .resolve();
  }

  load(pointer: string, options: GithubLoaderOptions): Promise<Source[]> {
    const fetchFn = (options.customFetch as AsyncFetchFn) || asyncFetch;
    return this.loadSyncOrAsync(pointer, options, fetchFn);
  }

  loadSync(pointer: string, options: GithubLoaderOptions): Source[] {
    const fetchFn: SyncFetchFn = options.customFetch || syncFetch;
    return this.loadSyncOrAsync(pointer, options, fetchFn);
  }

  handleResponse({
    pointer,
    path,
    options,
    response,
    status,
  }: {
    pointer: string;
    path: string;
    options: any;
    response: any;
    status: number;
  }) {
    let errorMessage: string | null = null;

    if (response.errors && response.errors.length > 0) {
      errorMessage = response.errors.map((item: Error) => item.message).join(', ');
    } else if (status === 401) {
      errorMessage = response.message;
    } else if (response.message) {
      errorMessage = response.message;
    } else if (!response.data) {
      errorMessage = response;
    }

    if (errorMessage) {
      throw new Error('Unable to download schema from github: ' + errorMessage);
    }

    if (!response.data.repository.object) {
      throw new Error(`Unable to find file: ${path} on ${pointer.replace(`:${path}`, '')}`);
    }

    const content = response.data.repository.object.text;

    if (/\.(gql|graphql)s?$/i.test(path)) {
      return [parseGraphQLSDL(pointer, content, options)];
    }

    if (/\.json$/i.test(path)) {
      return [parseGraphQLJSON(pointer, content, options)];
    }

    if (path.endsWith('.tsx') || path.endsWith('.ts') || path.endsWith('.js') || path.endsWith('.jsx')) {
      const sources = gqlPluckFromCodeStringSync(pointer, content, options.pluckConfig);
      return sources.map(source => ({
        location: pointer,
        document: parse(source, options),
      }));
    }

    throw new Error(`Invalid file extension: ${path}`);
  }

  prepareRequest({
    owner,
    ref,
    path,
    name,
    options,
  }: {
    owner: string;
    ref: string;
    path: string;
    name: string;
    options: GithubLoaderOptions;
  }): RequestInit {
    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'user-agent': 'graphql-tools',
    };
    if (options.token) {
      headers['authorization'] = `bearer ${options.token}`;
    }
    return {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          query GetGraphQLSchemaForGraphQLtools($owner: String!, $name: String!, $expression: String!) {
            repository(owner: $owner, name: $name) {
              object(expression: $expression) {
                ... on Blob {
                  text
                }
              }
            }
          }
        `,
        variables: {
          owner,
          name,
          expression: ref + ':' + path,
        },
        operationName: 'GetGraphQLSchemaForGraphQLtools',
      }),
    };
  }
}
