import { printSchema, buildSchema, parse, print } from 'graphql';
import { GithubLoader } from '../src/index.js';
import { Response } from '@ardatan/sync-fetch';

const owner = 'kamilkisiela';
const name = 'graphql-inspector-example';
const ref = 'master';
const path = 'example/schemas/schema.graphqls';
const token = 'MY-SECRET-TOKEN';

const pointer = `github:${owner}/${name}#${ref}:${path}`;

const typeDefs = /* GraphQL */ `
  type Post {
    id: ID
    title: String @deprecated(reason: "No more used")
    createdAt: String
    modifiedAt: String
  }
  type Query {
    post: Post!
    posts: [Post!]
  }
`;

function normalize(doc: string): string {
  return print(parse(doc));
}

function assertNonMaybe<T>(input: T): asserts input is Exclude<T, null | undefined> {
  if (input == null) {
    throw new Error('Value should be neither null nor undefined.');
  }
}

test('load schema from GitHub', () => {
  let params: any = null;

  const loader = new GithubLoader();

  const [source] = loader.loadSync(pointer, {
    token,
    customFetch: (url: RequestInfo, options?: RequestInit) => {
      expect(url.toString()).toBe(`https://api.github.com/graphql`);
      expect(options?.method).toBe('POST');
      const body = JSON.parse(options?.body?.toString() || '{}');
      params = {
        headers: options?.headers,
        query: body.query,
        variables: body.variables,
        operationName: body.operationName,
      };
      return new Response(
        JSON.stringify({
          data: {
            repository: {
              object: {
                text: typeDefs,
              },
            },
          },
        })
      );
    },
  });

  assertNonMaybe(params);

  // headers
  expect(params.headers['content-type']).toContain('application/json; charset=utf-8');
  expect(params.headers.authorization).toContain(`bearer ${token}`);

  // query
  expect(normalize(params.query)).toEqual(
    normalize(/* GraphQL */ `
      query GetGraphQLSchemaForGraphQLtools($owner: String!, $name: String!, $expression: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expression) {
            ... on Blob {
              text
            }
          }
        }
      }
    `)
  );

  // variables
  expect(params.variables).toEqual({
    owner,
    name,
    expression: ref + ':' + path,
  });
  assertNonMaybe(params.operationName);
  // name
  expect(params.operationName).toEqual('GetGraphQLSchemaForGraphQLtools');

  assertNonMaybe(source.document);
  // schema
  expect(print(source.document)).toEqual(printSchema(buildSchema(typeDefs)));
});

test('simply skips schema for path that cannot be loaded', async () => {
  const loader = new GithubLoader();

  const result = await loader.load('./test/123', {
    token,
  });
  expect(result).toEqual([]);
});

test('expect loadSync to handle 401 request errors gracefully', async () => {
  const result = () => {
    const loader = new GithubLoader();
    return loader.loadSync(pointer, {
      token,
      customFetch: () => {
        const response = new Response(
          JSON.stringify({ message: 'Bad credentials', documentation_url: 'https://docs.github.com/graphql' }),
          { status: 401 }
        );
        return response;
      },
    });
  };
  expect(result).toThrowError('Unable to download schema from github: Bad credentials');
});

describe('expect handleResponse to handle error messages gracefully', () => {
  it('Should handle string responses', () => {
    const expectedMessage = 'I am not a json object';
    const result = () => {
      const loader = new GithubLoader();

      loader.handleResponse({
        pointer: '',
        path: '',
        options: {},
        response: expectedMessage,
        status: 200,
      });
    };

    expect(result).toThrowError(`Unable to download schema from github: ${expectedMessage}`);
  });

  it('Should handle multiple error messages', () => {
    type ErrorMessage = { message: string };

    // An arbirary number of error messages
    const errorMessages: ErrorMessage[] = [...Array(Math.floor(Math.random() * 10))].map((_, index) => ({
      message: `Error message ${index}`,
    }));

    const result = () => {
      const loader = new GithubLoader();

      loader.handleResponse({
        pointer: '',
        path: '',
        options: {},
        response: {
          errors: errorMessages,
        },
        status: 200,
      });
    };

    const expectedMessage = errorMessages.map(e => e.message).join(', ');

    expect(result).toThrowError(`Unable to download schema from github: ${expectedMessage}`);
  });

  it('Should handle 401 error codes', () => {
    const result = () => {
      const loader = new GithubLoader();

      loader.handleResponse({
        pointer: '',
        path: '',
        options: {},
        response: {
          message: 'Bad credentials',
          documentation_url: 'https://docs.github.com/graphql',
        },
        status: 401,
      });
    };

    expect(result).toThrowError('Unable to download schema from github: Bad credentials');
  });
});
