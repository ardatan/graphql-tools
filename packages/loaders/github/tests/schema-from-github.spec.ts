import { printSchema, buildSchema, parse, print } from '@graphql-tools/graphql';
import { GithubLoader } from '../src/index.js';
import { Response } from 'sync-fetch';

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
