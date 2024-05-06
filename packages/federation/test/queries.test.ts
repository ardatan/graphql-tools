import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, print } from 'graphql';
import { execute } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

it('should not do a fragment spread on a union', () => {
  const queries: string[] = [];

  const schema = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: readFileSync(join(__dirname, 'fixtures', 'supergraphs', 'c.graphql'), 'utf8'),
    onExecutor() {
      return function executor(request) {
        queries.push(print(request.document));
        return {};
      };
    },
  });

  execute({
    schema,
    document: parse(/* GraphQL */ `
      {
        fooBar {
          ... on Foo {
            name
          }
          ... on Bar {
            name
          }
        }
        mustFooBar {
          ... on Foo {
            name
          }
          ... on Bar {
            name
          }
        }
      }
    `),
  });

  expect(queries[0]).toContain(`{
  __typename
  fooBar {
    ... on Foo {
      name
    }
    ... on Bar {
      name
    }
    __typename
  }
}`);
  expect(queries[1]).toContain(`{
  __typename
  mustFooBar {
    ... on Foo {
      name
    }
    ... on Bar {
      name
    }
    __typename
  }
}`);
});
