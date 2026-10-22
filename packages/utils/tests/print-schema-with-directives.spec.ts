import {
  buildASTSchema,
  buildSchema,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInputObjectTypeConfig,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  parse,
  printSchema,
  specifiedDirectives,
  stripIgnoredCharacters,
} from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { RenameTypes, wrapSchema } from '@graphql-tools/wrap';
import { printSchemaWithDirectives, pruneSchema } from '../src/index.js';

describe('printSchemaWithDirectives', () => {
  it(`Should print with directives, while printSchema doesn't`, () => {
    const schemaWithDirectives = buildSchema(/* GraphQL */ `
      directive @entity on OBJECT
      directive @id on FIELD_DEFINITION
      directive @link on FIELD_DEFINITION

      type Query {
        me: User
      }

      type User @entity {
        id: ID! @id
        friends: [User!]! @link
      }
    `);

    const printedSchemaByGraphQL = printSchema(schemaWithDirectives);
    expect(printedSchemaByGraphQL).toContain('directive @entity on OBJECT');
    expect(printedSchemaByGraphQL).not.toContain(`id: ID! @id`);
    expect(printedSchemaByGraphQL).not.toContain(`friends: [User!]! @link`);
    expect(printedSchemaByGraphQL).not.toContain(`type User @entity`);
    const printedSchemaAlternative = printSchemaWithDirectives(schemaWithDirectives);
    expect(printedSchemaAlternative).toContain('directive @entity on OBJECT');
    expect(printedSchemaAlternative).toContain(`id: ID! @id`);
    expect(printedSchemaAlternative).toContain(`friends: [User!]! @link`);
    expect(printedSchemaAlternative).toContain(`type User @entity`);
  });

  it('Should print with directives, even without definitions', () => {
    const schemaWithDirectives = stitchSchemas({
      typeDefs: /* GraphQL */ `
        type Query {
          me: User
        }

        type User @entity {
          id: ID! @id
          friends: [User!]! @link
        }
      `,
    });

    const printedSchema = printSchemaWithDirectives(schemaWithDirectives);
    expect(printedSchema).toContain(`id: ID! @id`);
    expect(printedSchema).toContain(`friends: [User!]! @link`);
    expect(printedSchema).toContain(`type User @entity`);
  });

  it('Should print with directives, even when using extend', () => {
    // note that in graphql v14, similar test will fail when using buildSchema from graphql-js
    // instead of makeExecutableSchema, because in v14, buildSchema ignores the extend keywords
    const schemaWithDirectives = makeExecutableSchema({
      typeDefs: `
        directive @entity on OBJECT

        type Query {
          me: User
        }

        type User {
          id: ID!
          friends: [User!]!
        }

        extend type User @entity
      `,
    });

    const printedSchemaAlternative = printSchemaWithDirectives(schemaWithDirectives);
    expect(printedSchemaAlternative).toContain('directive @entity on OBJECT');
    expect(printedSchemaAlternative).toContain(`type User @entity`);
  });

  it('Should print with directives even with code-first approach', () => {
    const schemaTypes = Object.create(null);
    schemaTypes.Query = new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        me: { type: schemaTypes.User },
      }),
    });
    schemaTypes.User = new GraphQLObjectType({
      name: 'User',
      fields: () => ({
        id: {
          type: new GraphQLNonNull(GraphQLID),
          extensions: {
            directives: {
              id: {},
            },
          },
        },
        friends: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(schemaTypes.User))),
          extensions: {
            directives: {
              link: {},
            },
          },
        },
      }),
      extensions: {
        directives: {
          entity: {},
        },
      },
    });

    const schemaWithDirectives = new GraphQLSchema({
      query: schemaTypes.Query,
      directives: specifiedDirectives.concat([
        new GraphQLDirective({
          name: 'entity',
          locations: ['OBJECT'] as any[],
        }),
        new GraphQLDirective({
          name: 'id',
          locations: ['FIELD_DEFINITION'] as any[],
        }),
        new GraphQLDirective({
          name: 'link',
          locations: ['FIELD_DEFINITION'] as any[],
        }),
      ]),
    });

    const printedSchema = printSchemaWithDirectives(schemaWithDirectives);
    expect(printedSchema).toContain('directive @entity on OBJECT');
    expect(printedSchema).toContain(`id: ID! @id`);
    expect(printedSchema).toContain(`friends: [User!]! @link`);
    expect(printedSchema).toContain(`type User @entity`);
  });

  it('Should print with directives with code-first approach, without directive defs', () => {
    const schemaTypes = Object.create(null);
    schemaTypes.Query = new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        me: { type: schemaTypes.User },
      }),
    });
    schemaTypes.User = new GraphQLObjectType({
      name: 'User',
      fields: () => ({
        id: {
          type: new GraphQLNonNull(GraphQLID),
          extensions: {
            directives: {
              id: {},
            },
          },
        },
        friends: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(schemaTypes.User))),
          extensions: {
            directives: {
              link: {},
            },
          },
        },
      }),
      extensions: {
        directives: {
          entity: {},
        },
      },
    });

    const schemaWithDirectives = new GraphQLSchema({
      query: schemaTypes.Query,
    });

    const printedSchema = printSchemaWithDirectives(schemaWithDirectives);
    expect(printedSchema).toContain(`id: ID! @id`);
    expect(printedSchema).toContain(`friends: [User!]! @link`);
    expect(printedSchema).toContain(`type User @entity`);
  });

  it(`Should print types correctly if they don't have astNode`, () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GraphQLJSON } = require('graphql-scalars');
    const schema = makeExecutableSchema({
      typeDefs: `
      scalar JSON

      type TestType {
        testField: JSON!
      }

      type Other {
        something: String
      }

      type Query {
        test: TestType
        other: Other!
      }
      `,
      resolvers: {
        Other: {
          something: () => 'a',
        },
        JSON: GraphQLJSON,
      },
    });

    const output = printSchemaWithDirectives(schema);

    const specifiedByValue = ((GraphQLJSON as any)['specifiedByUrl'] ||
      (GraphQLJSON as any)['specifiedByURL']) as string;
    if (specifiedByValue) {
      expect(output).toContain(`scalar JSON @specifiedBy(url: "${specifiedByValue}")`);
    } else {
      expect(output).toContain('scalar JSON');
    }
    expect(output).toContain('type Other');
    expect(output).toContain('type TestType');
    expect(output).toContain('type Query');
  });

  it(`Should print directives correctly if they don't have astNode`, () => {
    const schema = new GraphQLSchema({
      directives: [
        new GraphQLDirective({
          name: 'dummy',
          locations: ['QUERY'] as any[],
        }),
      ],
    } as any);

    const output = printSchemaWithDirectives(schema);

    expect(output).toContain('directive @dummy on QUERY');
  });

  it(`Should print enum value deprecations correctly if they don't have astNode`, () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {},
      }),
      types: [
        new GraphQLEnumType({
          name: 'Color',
          values: {
            RED: {
              value: 'RED',
              deprecationReason: 'No longer supported',
            },
            BLUE: {
              value: 'BLUE',
            },
          },
        }),
      ],
    });

    const output = printSchemaWithDirectives(schema);

    expect(output).toContain('RED @deprecated(reason: "No longer supported")');
  });

  it('should print comments', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        """
        Test Query Comment
        """
        type Query {
          """
          Test Field Comment
          """
          foo: String
        }
      `,
    });
    const output = printSchemaWithDirectives(schema);

    expect(output).toContain('Test Query Comment');
    expect(output).toContain('Test Field Comment');
  });

  it('prefers runtime descriptions over stale astNode descriptions (#5508)', () => {
    const schema = buildSchema(/* GraphQL */ `
      """
      Old type
      """
      type Query {
        """
        Old field
        """
        foo: String
      }
    `);

    const queryType = schema.getQueryType()!;
    const fooField = queryType.getFields()['foo'];
    // Keep original astNodes (stale descriptions) while overriding runtime descriptions.
    const transformedSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        description: 'New type',
        astNode: queryType.astNode,
        fields: {
          foo: {
            type: fooField.type,
            description: 'New field',
            astNode: fooField.astNode,
          },
        },
      }),
    });

    const output = printSchemaWithDirectives(transformedSchema);
    expect(output).toContain('New type');
    expect(output).toContain('New field');
    expect(output).not.toContain('Old type');
    expect(output).not.toContain('Old field');
  });

  it('omits empty and whitespace-only runtime descriptions', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        description: '',
        fields: {
          empty: {
            type: GraphQLString,
            description: '',
          },
          whitespace: {
            type: GraphQLString,
            description: '   \n\t  ',
          },
          kept: {
            type: GraphQLString,
            description: 'Keep me',
          },
        },
      }),
    });

    const output = printSchemaWithDirectives(schema);
    expect(output).not.toContain('""""""');
    expect(output).not.toMatch(/"""\s*"""\s*whitespace:/);
    expect(output).toContain('Keep me');
    expect(output).toMatch(/kept:\s*String/);
    expect(output).toMatch(/empty:\s*String/);
    expect(output).toMatch(/^\s*whitespace:\s*String/m);
  });

  it('omits empty and whitespace-only astNode descriptions when runtime description is absent', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          emptyAst: {
            type: GraphQLString,
            astNode: {
              kind: Kind.FIELD_DEFINITION,
              name: { kind: Kind.NAME, value: 'emptyAst' },
              type: {
                kind: Kind.NAMED_TYPE,
                name: { kind: Kind.NAME, value: 'String' },
              },
              description: {
                kind: Kind.STRING,
                value: '',
                block: true,
              },
            },
          },
          whitespaceAst: {
            type: GraphQLString,
            astNode: {
              kind: Kind.FIELD_DEFINITION,
              name: { kind: Kind.NAME, value: 'whitespaceAst' },
              type: {
                kind: Kind.NAMED_TYPE,
                name: { kind: Kind.NAME, value: 'String' },
              },
              description: {
                kind: Kind.STRING,
                value: '   \n\t  ',
                block: true,
              },
            },
          },
          keptAst: {
            type: GraphQLString,
            astNode: {
              kind: Kind.FIELD_DEFINITION,
              name: { kind: Kind.NAME, value: 'keptAst' },
              type: {
                kind: Kind.NAMED_TYPE,
                name: { kind: Kind.NAME, value: 'String' },
              },
              description: {
                kind: Kind.STRING,
                value: 'Keep AST',
                block: true,
              },
            },
          },
        },
      }),
    });

    const output = printSchemaWithDirectives(schema);
    expect(output).not.toContain('""""""');
    expect(output).not.toMatch(/"""\s*"""\s*emptyAst:/);
    expect(output).not.toMatch(/"""\s*"""\s*whitespaceAst:/);
    expect(output).toContain('Keep AST');
    expect(output).toMatch(/^\s*emptyAst:\s*String/m);
    expect(output).toMatch(/^\s*whitespaceAst:\s*String/m);
  });

  it('should print transformed schema correctly', () => {
    const printedSchema = /* GraphQL */ `
      type Foo {
        bar: String
      }
      type Bar {
        foo: Foo
      }
      type Query {
        bar: Bar
      }
    `;

    const schema = buildSchema(printedSchema);

    const transformedSchema = wrapSchema({
      schema,
      transforms: [new RenameTypes(typeName => `My${typeName}`)],
    });
    const printedTransformedSchema = printSchemaWithDirectives(transformedSchema);
    expect(printedTransformedSchema).not.toContain('type Foo');
    expect(printedTransformedSchema).toContain('type MyFoo');
    expect(printedTransformedSchema).not.toContain('type Bar');
    expect(printedTransformedSchema).toContain('type MyBar');
    expect(printedTransformedSchema).not.toContain('bar: Bar');
    expect(printedTransformedSchema).toContain('bar: MyBar');
    expect(printedTransformedSchema).not.toContain('foo: Foo');
    expect(printedTransformedSchema).toContain('foo: MyFoo');
  });
  it('should print all directives', async () => {
    const typeDefs = /* GraphQL */ `
      directive @SCHEMA on SCHEMA
      directive @SCALAR on SCALAR
      directive @OBJECT on OBJECT
      directive @ARGUMENT_DEFINITION on ARGUMENT_DEFINITION
      directive @FIELD_DEFINITION on FIELD_DEFINITION
      directive @INTERFACE on INTERFACE
      directive @UNION on UNION
      directive @ENUM on ENUM
      directive @ENUM_VALUE on ENUM_VALUE
      directive @INPUT_OBJECT on INPUT_OBJECT
      directive @INPUT_FIELD_DEFINITION on INPUT_FIELD_DEFINITION

      schema @SCHEMA {
        query: SomeType
      }

      scalar DateTime @SCALAR

      type SomeType @OBJECT {
        someField(someArg: Int! @ARGUMENT_DEFINITION): String @FIELD_DEFINITION
      }

      interface SomeInterface @INTERFACE {
        someField: String
      }

      union SomeUnion @UNION = SomeType

      enum SomeEnum @ENUM {
        someEnumValue @ENUM_VALUE
      }

      input SomeInputType @INPUT_OBJECT {
        someInputField: String @INPUT_FIELD_DEFINITION
        someOtherInputField: Int = 1
      }
    `;
    const schema = buildSchema(typeDefs);
    const printedSchema = printSchemaWithDirectives(schema);
    const printedSchemaLines = typeDefs.split('\n');
    for (const line of printedSchemaLines) {
      expect(printedSchema).toContain(line.trim());
    }
  });
  it(`prints oneOf correctly if they don't have astNode`, () => {
    const oneOfInputType = new GraphQLInputObjectType({
      name: 'OneOfInput',
      isOneOf: true,
      fields: {
        a: {
          type: GraphQLString,
        },
        b: {
          type: GraphQLInt,
        },
      },
    } as GraphQLInputObjectTypeConfig);
    // Only if `isOneOf` is supported, it should print the directive
    if ((oneOfInputType as any).isOneOf) {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {},
        }),
        types: [oneOfInputType],
      });

      const output = printSchemaWithDirectives(schema);
      expect(output).toContain('input OneOfInput @oneOf');
    }
  });
  it('should print enum directive arg by name when internal value differs', () => {
    const OAuthScopeEnum = new GraphQLEnumType({
      name: 'OAuthScopeEnum',
      values: {
        TEAMS_WRITE: { value: 'teams:write' },
      },
    });

    const scopeDirective = new GraphQLDirective({
      name: 'scope',
      args: {
        name: { type: new GraphQLNonNull(OAuthScopeEnum) },
      },
      locations: ['FIELD_DEFINITION'] as any,
    });

    const schema = new GraphQLSchema({
      directives: [...specifiedDirectives, scopeDirective],
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          me: {
            type: GraphQLString,
            extensions: {
              directives: {
                scope: { name: 'TEAMS_WRITE' },
              },
            },
          },
        },
      }),
      types: [OAuthScopeEnum],
    });

    const output = printSchemaWithDirectives(schema);
    expect(output).toContain('me: String @scope(name: TEAMS_WRITE)');
  });

  it('preserves enum AST nodes in custom scalar directive arguments (#8557)', () => {
    const src = /* GraphQL */ `
      scalar Scalar

      directive @directive(arg: Scalar!) on FIELD_DEFINITION

      type Object {
        field: String @directive(arg: argument_value)
      }
    `;

    const schema = buildASTSchema(parse(src));
    const output = printSchemaWithDirectives(schema);

    expect(output).toContain('@directive(arg: argument_value)');
    expect(output).not.toContain('@directive(arg: "argument_value")');
  });

  it('preserves string AST nodes in custom scalar directive arguments', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar Scalar

      directive @directive(arg: Scalar!) on FIELD_DEFINITION

      type Query {
        field: String @directive(arg: "argument_value")
      }
    `);

    const output = printSchemaWithDirectives(schema);

    expect(output).toContain('@directive(arg: "argument_value")');
  });

  it('preserves mixed enum and string literals in list and input directive arguments', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar Scalar

      input Input {
        field: Scalar
      }

      directive @listDir(arg: [Scalar!]!) on FIELD_DEFINITION
      directive @inputDir(arg: Input!) on FIELD_DEFINITION

      type Query {
        listed: String @listDir(arg: [argument_value, "string_value"])
        nested: String @inputDir(arg: { field: argument_value })
      }
    `);

    const output = stripIgnoredCharacters(printSchemaWithDirectives(schema));

    expect(output).toContain(
      stripIgnoredCharacters('@listDir(arg: [argument_value, "string_value"])'),
    );
    expect(output).toContain(stripIgnoredCharacters('@inputDir(arg: { field: argument_value })'));
  });

  it('still prints code-first custom scalar directive args as strings', () => {
    const Scalar = new GraphQLScalarType({ name: 'Scalar' });
    const directive = new GraphQLDirective({
      name: 'directive',
      args: {
        arg: { type: new GraphQLNonNull(Scalar) },
      },
      locations: ['FIELD_DEFINITION'] as any,
    });

    const schema = new GraphQLSchema({
      directives: [...specifiedDirectives, directive],
      types: [Scalar],
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          field: {
            type: GraphQLString,
            extensions: {
              directives: {
                directive: { arg: 'argument_value' },
              },
            },
          },
        },
      }),
    });

    const output = printSchemaWithDirectives(schema);
    expect(output).toContain('@directive(arg: "argument_value")');
  });

  it('prints a federation-style subgraph schema correctly', () => {
    const sdl = stripIgnoredCharacters(/* GraphQL */ `
      extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

      type User @key(fields: "id") {
        id: ID!
        username: String
      }
    `);
    const userSubgraph = buildSchema(sdl, { assumeValid: true, assumeValidSDL: true });
    const printedSchema = stripIgnoredCharacters(printSchemaWithDirectives(userSubgraph));
    expect(printedSchema).toBe(sdl);
  });

  it('should print enum directive arg by name when internal value differs', () => {
    const OAuthScopeEnum = new GraphQLEnumType({
      name: 'OAuthScopeEnum',
      values: {
        TEAMS_WRITE: { value: 'teams:write' },
      },
    });

    const scopeDirective = new GraphQLDirective({
      name: 'scope',
      args: {
        name: { type: new GraphQLNonNull(OAuthScopeEnum) },
      },
      locations: ['FIELD_DEFINITION'] as any,
    });

    const schema = new GraphQLSchema({
      directives: [...specifiedDirectives, scopeDirective],
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          me: {
            type: GraphQLString,
            extensions: {
              directives: {
                scope: { name: 'TEAMS_WRITE' },
              },
            },
          },
        },
      }),
      types: [OAuthScopeEnum],
    });

    const output = printSchemaWithDirectives(schema);
    expect(output).toContain('me: String @scope(name: TEAMS_WRITE)');
  });

  it('omits pruned mutation and subscription from the schema definition', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        schema {
          query: Query
          mutation: Mutation
          subscription: Subscription
        }

        type Query {
          foo: Boolean
        }

        type Mutation

        type Subscription
      `,
    });

    const pruned = pruneSchema(schema);
    expect(pruned.getMutationType()).toBeUndefined();
    expect(pruned.getSubscriptionType()).toBeUndefined();

    const output = stripIgnoredCharacters(printSchemaWithDirectives(pruned));
    expect(output).toBe(
      stripIgnoredCharacters(/* GraphQL */ `
        schema {
          query: Query
        }

        type Query {
          foo: Boolean
        }
      `),
    );
  });
});
