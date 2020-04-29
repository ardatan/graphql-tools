import { RenameTypes, wrapSchema } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildSchema, printSchema } from 'graphql';
import { printSchemaWithDirectives } from '../src';
import { GraphQLJSON } from 'graphql-scalars';

describe('printSchemaWithDirectives', () => {
  it('Should print with directives, while printSchema doesnt', () => {
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

  it('Should print types correctly if they dont have astNode', () => {
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

    expect(output).toContain('scalar JSON');
    expect(output).toContain('type Other');
    expect(output).toContain('type TestType');
    expect(output).toContain('type Query');
  });

  it('should print comments', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */`
        """
          Test Query Comment
        """
        type Query {
          """
            Test Field Comment
          """
          foo: String
        }
      `
    });
    const output = printSchemaWithDirectives(schema);

    expect(output).toContain('Test Query Comment');
    expect(output).toContain('Test Field Comment');

  });
  it('should print transformed schema correctly', () => {

    const printedSchema = /* GraphQL */`
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

    const transformedSchema = wrapSchema(schema, [
      new RenameTypes(typeName => `My${typeName}`)
    ]);
    const printedTransformedSchema = printSchemaWithDirectives(transformedSchema);
    expect(printedTransformedSchema).not.toContain(/* GraphQL */`type Foo`);
    expect(printedTransformedSchema).toContain(/* GraphQL */`type MyFoo`);
    expect(printedTransformedSchema).not.toContain(/* GraphQL */`type Bar`);
    expect(printedTransformedSchema).toContain(/* GraphQL */`type MyBar`);
    expect(printedTransformedSchema).not.toContain(/* GraphQL */`bar: Bar`);
    expect(printedTransformedSchema).toContain(/* GraphQL */`bar: MyBar`);
    expect(printedTransformedSchema).not.toContain(/* GraphQL */`foo: Foo`);
    expect(printedTransformedSchema).toContain(/* GraphQL */`foo: MyFoo`);
  });

});
