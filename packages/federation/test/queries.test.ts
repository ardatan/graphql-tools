import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, print } from 'graphql';
import { execute } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

it('should not do a fragment spread on a union', () => {
  let query = '';

  const schema = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: readFileSync(join(__dirname, 'fixtures', 'supergraphs', 'c.graphql'), 'utf8'),
    onExecutor() {
      return function executor(request) {
        query = print(request.document);
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
      }
    `),
  });

  expect(query).toMatchInlineSnapshot(`
"{
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
}"
`);
});
