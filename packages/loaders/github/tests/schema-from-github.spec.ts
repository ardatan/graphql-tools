import { printSchema, buildSchema, parse, print } from 'graphql';
import { GithubLoader } from '../src/index.js';
import { fetch } from '@whatwg-node/fetch';

const owner = 'ardatan';
const name = 'graphql-tools';
const ref = 'master';
const path = 'packages/loaders/github/tests/schema-from-github.spec.ts';

const pointer = `github:${owner}/${name}#${ref}:${path}`;

const token = process.env['GITHUB_TOKEN'] || '';

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

if (token) {
  test('load schema from GitHub', async () => {
    const loader = new GithubLoader();

    const customFetch = jest.fn(fetch);

    const result = await loader.load(pointer, {
      token,
      customFetch,
      headers: {
        'x-custom-header': 'custom-header-value',
      },
    });

    const [source] = result;

    const params = customFetch.mock.calls[0][1];

    // headers
    expect(params?.headers?.['content-type']).toContain('application/json; charset=utf-8');
    if (token) {
      expect(params?.headers?.['authorization']).toContain(`bearer ${token}`);
    }
    expect(params?.headers?.['x-custom-header']).toContain('custom-header-value');

    const paramsBody = JSON.parse(params?.body as string);

    // query
    expect(normalize(paramsBody.query)).toEqual(
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
    expect(paramsBody.variables).toEqual({
      owner,
      name,
      expression: ref + ':' + path,
    });
    assertNonMaybe(paramsBody.operationName);
    // name
    expect(paramsBody.operationName).toEqual('GetGraphQLSchemaForGraphQLtools');

    assertNonMaybe(source.document);
    // schema
    expect(print(source.document)).toEqual(printSchema(buildSchema(typeDefs)));
  });
}

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
      token: 'BAD_TOKEN',
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
