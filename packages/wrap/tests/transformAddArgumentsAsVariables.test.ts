import { wrapSchema, AddArgumentsAsVariables } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse, execute } from 'graphql';
import { assertSome } from '@graphql-tools/utils';

describe('AddArgumentsAsVariables', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      input InputObject {
        field1: String
        field2: String
      }

      type OutputObject {
        field1: String
        field2: String
        field3: String
        field4: String
      }

      type Query {
        test(argument: InputObject, otherArgument: String, thirdArgument: String): OutputObject
      }
    `,
    resolvers: {
      Query: {
        test: (_root, args) => {
          return { ...args.argument, field3: args.otherArgument, field4: args.thirdArgument };
        },
      },
    },
  });

  const transformedSchema = wrapSchema({
    schema,
    transforms: [
      new AddArgumentsAsVariables({ argument: { field1: 'field1', field2: 'field2' }, thirdArgument: 'field4' }),
    ],
  });

  test('adds provided arguments as variables', async () => {
    const query = /* GraphQL */ `
      {
        test(otherArgument: "field3") {
          field1
          field2
          field3
          field4
        }
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
    });
    assertSome(result.data);
    expect(result.errors).toBeUndefined();
    const dataTest: any = result.data['test'];
    expect(dataTest.field1).toBe('field1');
    expect(dataTest.field2).toBe('field2');
    expect(dataTest.field3).toBe('field3');
    expect(dataTest.field4).toBe('field4');
  });
});
