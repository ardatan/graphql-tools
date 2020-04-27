import { UniversalLoader, parseGraphQLSDL, parseGraphQLJSON, SingleFileOptions } from '@graphql-tools/utils';
import { fetch } from 'cross-fetch';
import { GraphQLTagPluckOptions, gqlPluckFromCodeString } from '@graphql-tools/graphql-tag-pluck';

// github:owner/name#ref:path/to/file
function extractData(
  pointer: string
): {
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

export interface GithubLoaderOptions extends SingleFileOptions {
  token: string;
  pluckConfig?: GraphQLTagPluckOptions;
}

export class GithubLoader implements UniversalLoader<GithubLoaderOptions> {
  loaderId() {
    return 'github-loader';
  }

  async canLoad(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('github:');
  }

  canLoadSync() {
    return false;
  }

  async load(pointer: string, options: GithubLoaderOptions) {
    const { owner, name, ref, path } = extractData(pointer);
    const request = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `bearer ${options.token}`,
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
    });
    const response = await request.json();

    let errorMessage: string | null = null;

    if (response.errors && response.errors.length > 0) {
      errorMessage = response.errors.map((item: Error) => item.message).join(', ');
    } else if (!response.data) {
      errorMessage = response;
    }

    if (errorMessage) {
      throw new Error('Unable to download schema from github: ' + errorMessage);
    }

    const content = response.data.repository.object.text;

    if (/\.(gql|graphql)s?$/i.test(path)) {
      return parseGraphQLSDL(pointer, content, options);
    }

    if (/\.json$/i.test(path)) {
      return parseGraphQLJSON(pointer, content, options);
    }

    const rawSDL = await gqlPluckFromCodeString(pointer, content, options.pluckConfig);
    if (rawSDL) {
      return {
        location: pointer,
        rawSDL,
      };
    }

    throw new Error(`Invalid file extension: ${path}`);
  }

  loadSync(): never {
    throw new Error('Loader GitHub has no sync mode');
  }
}
