import { Loader, parseGraphQLSDL, parseGraphQLJSON, BaseLoaderOptions, Source } from '@graphql-tools/utils';
import { GraphQLTagPluckOptions, gqlPluckFromCodeStringSync } from '@graphql-tools/graphql-tag-pluck';
import { parse } from 'graphql';
import syncFetch from '@ardatan/sync-fetch';
import { fetch as asyncFetch } from '@whatwg-node/fetch';

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
  token: string;
  /**
   * Additional options to pass to `graphql-tag-pluck`
   */
  pluckConfig?: GraphQLTagPluckOptions;
  customFetch?: typeof asyncFetch | typeof syncFetch;
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

  async load(pointer: string, options: GithubLoaderOptions): Promise<Source[]> {
    if (!(await this.canLoad(pointer))) {
      return [];
    }
    const { owner, name, ref, path } = extractData(pointer);
    const fetch = options.customFetch || asyncFetch;
    const request = await fetch(
      'https://api.github.com/graphql',
      this.prepareRequest({ owner, ref, path, name, options })
    );
    const response = await request.json();
    const status = request.status;
    return this.handleResponse({ pointer, path, options, response, status });
  }

  loadSync(pointer: string, options: GithubLoaderOptions): Source[] {
    if (!this.canLoadSync(pointer)) {
      return [];
    }
    const { owner, name, ref, path } = extractData(pointer);
    const fetch = options.customFetch || syncFetch;
    const request = fetch('https://api.github.com/graphql', this.prepareRequest({ owner, ref, path, name, options }));
    const response = request.json();
    const status = request.status;
    return this.handleResponse({ pointer, path, options, response, status });
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
    } else if (!response.data) {
      errorMessage = response;
    }

    if (errorMessage) {
      throw new Error('Unable to download schema from github: ' + errorMessage);
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
    return {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `bearer ${options.token}`,
      },
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
