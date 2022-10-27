import { execute } from '@graphql-tools/executor';
import { wrapSchema, RenameTypes } from '@graphql-tools/wrap';
import { GraphQLSchema, parse } from 'graphql';
import { propertySchema } from '../../testing/fixtures/schemas.js';

describe('RenameTypes', () => {
  describe('rename type', () => {
    let schema: GraphQLSchema;
    beforeAll(() => {
      const transforms = [
        new RenameTypes(
          (name: string) =>
            ({
              Property: 'House',
              Location: 'Spots',
              TestInterface: 'TestingInterface',
              DateTime: 'Datum',
              InputWithDefault: 'DefaultingInput',
              TestInterfaceKind: 'TestingInterfaceKinds',
              TestImpl1: 'TestImplementation1',
            }[name])
        ),
      ];
      schema = wrapSchema({
        schema: propertySchema,
        transforms,
      });
    });
    test('should work', async () => {
      const result = await execute({
        schema,
        document: parse(/* GraphQL */ `
          query ($input: DefaultingInput!) {
            interfaceTest(kind: ONE) {
              ... on TestingInterface {
                testString
              }
            }
            propertyById(id: "p1") {
              ... on House {
                id
              }
            }
            dateTimeTest
            defaultInputTest(input: $input)
          }
        `),
        variableValues: {
          input: {
            test: 'bar',
          },
        },
      });

      expect(result).toEqual({
        data: {
          dateTimeTest: '1987-09-25T12:00:00',
          defaultInputTest: 'bar',
          interfaceTest: {
            testString: 'test',
          },
          propertyById: {
            id: 'p1',
          },
        },
      });
    });
  });

  describe('namespacing', () => {
    let schema: GraphQLSchema;
    beforeAll(() => {
      const transforms = [
        new RenameTypes((name: string) => `_${name}`),
        new RenameTypes((name: string) => `Property${name}`),
      ];
      schema = wrapSchema({
        schema: propertySchema,
        transforms,
      });
    });
    test('should work', async () => {
      const result = await execute({
        schema,
        document: parse(/* GraphQL */ `
          query ($input: Property_InputWithDefault!) {
            interfaceTest(kind: ONE) {
              ... on Property_TestInterface {
                testString
              }
            }
            properties(limit: 1) {
              __typename
              id
            }
            propertyById(id: "p1") {
              ... on Property_Property {
                id
              }
            }
            dateTimeTest
            defaultInputTest(input: $input)
          }
        `),
        variableValues: {
          input: {
            test: 'bar',
          },
        },
      });

      expect(result).toEqual({
        data: {
          dateTimeTest: '1987-09-25T12:00:00',
          defaultInputTest: 'bar',
          interfaceTest: {
            testString: 'test',
          },
          properties: [
            {
              __typename: 'Property_Property',
              id: 'p1',
            },
          ],
          propertyById: {
            id: 'p1',
          },
        },
      });
    });
  });
});
