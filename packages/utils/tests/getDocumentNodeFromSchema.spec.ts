import { buildSchema, Kind } from 'graphql';
import { getDocumentNodeFromSchema } from '../src/index.js';

describe('getDocumentNodeFromSchema', () => {
  it('Should convert args with default String correctly', () => {
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

  it('Should convert args with default Int correctly', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        something(input: Int = 888): String
      }
    `);

    const result = getDocumentNodeFromSchema(schema);

    const args = result['definitions'].find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION)
      ?.fields?.[0].arguments;

    expect(args).toMatchInlineSnapshot(`
[
  {
    "defaultValue": {
      "kind": "IntValue",
      "value": "888",
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
        "value": "Int",
      },
    },
  },
]
`);
  });

  it('Should convert args with default Boolean correctly', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        something(input: Boolean = true): String
      }
    `);

    const result = getDocumentNodeFromSchema(schema);

    const args = result['definitions'].find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION)
      ?.fields?.[0].arguments;

    expect(args).toMatchInlineSnapshot(`
[
  {
    "defaultValue": {
      "kind": "BooleanValue",
      "value": true,
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
        "value": "Boolean",
      },
    },
  },
]
`);
  });

  it('Should convert args with default Float correctly', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        something(input: Float = 3.14): String
      }
    `);

    const result = getDocumentNodeFromSchema(schema);

    const args = result['definitions'].find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION)
      ?.fields?.[0].arguments;

    expect(args).toMatchInlineSnapshot(`
[
  {
    "defaultValue": {
      "kind": "FloatValue",
      "value": "3.14",
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
        "value": "Float",
      },
    },
  },
]
`);
  });

  it('Should convert args with default Enum correctly', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        something(input: Option = TWO): String
      }

      enum Option {
        ONE
        TWO
        THREE
      }
    `);

    const result = getDocumentNodeFromSchema(schema);

    const args = result['definitions'].find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION)
      ?.fields?.[0].arguments;

    expect(args).toMatchInlineSnapshot(`
[
  {
    "defaultValue": {
      "kind": "EnumValue",
      "value": "TWO",
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
        "value": "Option",
      },
    },
  },
]
`);
  });

  it('Should convert args with default List correctly', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        something(input: [String] = ["a", "b"]): String
      }
    `);

    const result = getDocumentNodeFromSchema(schema);

    const args = result['definitions'].find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION)
      ?.fields?.[0].arguments;

    expect(args).toMatchInlineSnapshot(`
[
  {
    "defaultValue": {
      "kind": "ListValue",
      "values": [
        {
          "kind": "StringValue",
          "value": "a",
        },
        {
          "kind": "StringValue",
          "value": "b",
        },
      ],
    },
    "description": undefined,
    "directives": [],
    "kind": "InputValueDefinition",
    "name": {
      "kind": "Name",
      "value": "input",
    },
    "type": {
      "kind": "ListType",
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": "String",
        },
      },
    },
  },
]
`);
  });

  it('Should convert args with default Input correctly', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        something(
          input: Input = {
            string: "ok"
            int: 123
            float: 4.56
            boolean: true
            enum: THREE
            nullValue: null
            list: ["c", "d", null]
            nested: { string: "wow", enum: TWO, int: null }
            nestedInputList: [
              { int: 777 }
              { float: 88.8 }
              { boolean: false }
              { enum: ONE }
              { list: ["e"] }
              null
            ]
          }
        ): String
      }

      input Input {
        string: String
        int: Int
        float: Float
        boolean: Boolean
        enum: Option
        nullValue: String
        list: [String]
        nested: Input
        nestedInputList: [Input]
      }

      enum Option {
        ONE
        TWO
        THREE
      }
    `);

    const result = getDocumentNodeFromSchema(schema);

    const args = result['definitions'].find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION)
      ?.fields?.[0].arguments;

    expect(args).toMatchInlineSnapshot(`
[
  {
    "defaultValue": {
      "fields": [
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "string",
          },
          "value": {
            "kind": "StringValue",
            "value": "ok",
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "int",
          },
          "value": {
            "kind": "IntValue",
            "value": "123",
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "float",
          },
          "value": {
            "kind": "FloatValue",
            "value": "4.56",
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "boolean",
          },
          "value": {
            "kind": "BooleanValue",
            "value": true,
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "enum",
          },
          "value": {
            "kind": "EnumValue",
            "value": "THREE",
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "nullValue",
          },
          "value": {
            "kind": "NullValue",
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "list",
          },
          "value": {
            "kind": "ListValue",
            "values": [
              {
                "kind": "StringValue",
                "value": "c",
              },
              {
                "kind": "StringValue",
                "value": "d",
              },
              {
                "kind": "NullValue",
              },
            ],
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "nested",
          },
          "value": {
            "fields": [
              {
                "kind": "ObjectField",
                "name": {
                  "kind": "Name",
                  "value": "string",
                },
                "value": {
                  "kind": "StringValue",
                  "value": "wow",
                },
              },
              {
                "kind": "ObjectField",
                "name": {
                  "kind": "Name",
                  "value": "int",
                },
                "value": {
                  "kind": "NullValue",
                },
              },
              {
                "kind": "ObjectField",
                "name": {
                  "kind": "Name",
                  "value": "enum",
                },
                "value": {
                  "kind": "EnumValue",
                  "value": "TWO",
                },
              },
            ],
            "kind": "ObjectValue",
          },
        },
        {
          "kind": "ObjectField",
          "name": {
            "kind": "Name",
            "value": "nestedInputList",
          },
          "value": {
            "kind": "ListValue",
            "values": [
              {
                "fields": [
                  {
                    "kind": "ObjectField",
                    "name": {
                      "kind": "Name",
                      "value": "int",
                    },
                    "value": {
                      "kind": "IntValue",
                      "value": "777",
                    },
                  },
                ],
                "kind": "ObjectValue",
              },
              {
                "fields": [
                  {
                    "kind": "ObjectField",
                    "name": {
                      "kind": "Name",
                      "value": "float",
                    },
                    "value": {
                      "kind": "FloatValue",
                      "value": "88.8",
                    },
                  },
                ],
                "kind": "ObjectValue",
              },
              {
                "fields": [
                  {
                    "kind": "ObjectField",
                    "name": {
                      "kind": "Name",
                      "value": "boolean",
                    },
                    "value": {
                      "kind": "BooleanValue",
                      "value": false,
                    },
                  },
                ],
                "kind": "ObjectValue",
              },
              {
                "fields": [
                  {
                    "kind": "ObjectField",
                    "name": {
                      "kind": "Name",
                      "value": "enum",
                    },
                    "value": {
                      "kind": "EnumValue",
                      "value": "ONE",
                    },
                  },
                ],
                "kind": "ObjectValue",
              },
              {
                "fields": [
                  {
                    "kind": "ObjectField",
                    "name": {
                      "kind": "Name",
                      "value": "list",
                    },
                    "value": {
                      "kind": "ListValue",
                      "values": [
                        {
                          "kind": "StringValue",
                          "value": "e",
                        },
                      ],
                    },
                  },
                ],
                "kind": "ObjectValue",
              },
              {
                "kind": "NullValue",
              },
            ],
          },
        },
      ],
      "kind": "ObjectValue",
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
        "value": "Input",
      },
    },
  },
]
`);
  });
});
