import { printSchema, buildSchema, parse, print } from 'graphql';
import { GithubLoader } from '../src';
import nock from 'nock'

const owner = 'kamilkisiela';
const name = 'graphql-inspector-example';
const ref = 'master';
const path = 'example/schemas/schema.graphqls';
const token = 'MY-SECRET-TOKEN';

const pointer = `github:${owner}/${name}#${ref}:${path}`;

const typeDefs = /* GraphQL */`
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

test('load schema from Github', async () => {
  let headers: Record<string, string> = {};
  let query: string;
  let variables: {};
  let operationName: string;

  const server = nock('https://api.github.com').post('/graphql').reply(function reply(_, body: any) {
    headers = this.req.headers;
    query = body.query;
    variables = body.variables;
    operationName = body.operationName;

    return [200, {
      data: {
        repository: {
          object: {
            text: typeDefs
          }
        }
      }
    }];
  });

  const loader = new GithubLoader();

  const schema = await loader.load(pointer, {
    token,
  });

  server.done();

  // headers
  expect(headers['content-type']).toContain('application/json; charset=utf-8');
  expect(headers.authorization).toContain(`bearer ${token}`);

  // query
  expect(normalize(query)).toEqual(
    normalize(`
      query GetGraphQLSchemaForGraphQLtools($owner: String!, $name: String!, $expression: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expression) {
            ... on Blob {
              text
            }
          }
        }
      }
    `),
  );

  // variables
  expect(variables).toEqual({
    owner,
    name,
    expression: ref + ':' + path,
  });

  // name
  expect(operationName).toEqual('GetGraphQLSchemaForGraphQLtools');

  // schema
  expect(print(schema.document)).toEqual(printSchema(buildSchema(typeDefs)));
});
