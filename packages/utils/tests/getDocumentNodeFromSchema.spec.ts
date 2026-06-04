import { buildSchema, Kind } from 'graphql';
import { getDocumentNodeFromSchema } from '../src/index.js';

describe('getDocumentNodeFromSchema', () => {
  it('Should convert args with default value correctly', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        something(input: String = "DEFAULT"): String
      }
    `);

    const result = getDocumentNodeFromSchema(schema);

    const args = result['definitions'].find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION)
      ?.fields?.[0].arguments;

    expect(args).toMatchInlineSnapshot(`
[
  {
    "defaultValue": {
      "kind": "StringValue",
      "value": "DEFAULT",
    },
    "description": undefined,
    "directives": [],
    "kind": "InputValueDefinition",
    "name": {
      "kind": "Name",
      "value": "input",
    },
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": "String",
      },
    },
  },
]
`);
  });
});
