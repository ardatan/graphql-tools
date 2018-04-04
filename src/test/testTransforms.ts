/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import { GraphQLSchema, GraphQLNamedType, graphql } from 'graphql';
import { propertySchema, bookingSchema } from './testingSchemas';
import { Transforms, transformSchema } from '../transforms';

describe('transforms', () => {
  describe('rename type', () => {
    let schema: GraphQLSchema;
    before(() => {
      const transforms = [
        Transforms.RenameTypes(
          (name: string) =>
            ({
              Property: 'House',
              Location: 'Spots',
              TestInterface: 'TestingInterface',
              DateTime: 'Datum',
              InputWithDefault: 'DefaultingInput',
              TestInterfaceKind: 'TestingInterfaceKinds',
              TestImpl1: 'TestImplementation1',
            }[name]),
        ),
      ];
      schema = transformSchema(propertySchema, transforms);
    });
    it('should work', async () => {
      const result = await graphql(
        schema,
        `
          query($input: DefaultingInput!) {
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
        `,
        {},
        {},
        {
          input: {
            test: 'bar',
          },
        },
      );

      expect(result).to.deep.equal({
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

  describe('namespace', () => {
    let schema: GraphQLSchema;
    before(() => {
      const transforms = [
        Transforms.RenameTypes((name: string) => `Property_${name}`),
      ];
      schema = transformSchema(propertySchema, transforms);
    });
    it('should work', async () => {
      const result = await graphql(
        schema,
        `
          query($input: Property_InputWithDefault!) {
            interfaceTest(kind: ONE) {
              ... on Property_TestInterface {
                testString
              }
            }
            propertyById(id: "p1") {
              ... on Property_Property {
                id
              }
            }
            dateTimeTest
            defaultInputTest(input: $input)
          }
        `,
        {},
        {},
        {
          input: {
            test: 'bar',
          },
        },
      );

      expect(result).to.deep.equal({
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

  describe('filter type', () => {
    let schema: GraphQLSchema;
    before(() => {
      const typeNames = ['ID', 'String', 'DateTime', 'Query', 'Booking'];
      const transforms = [
        Transforms.FilterTypes((type: GraphQLNamedType) =>
          typeNames.indexOf(type.name) >= 0
        ),
      ];
      schema = transformSchema(bookingSchema, transforms);
    });

    it('should work normally', async () => {
      const result = await graphql(
        schema,
        `
          query {
            bookingById(id: "b1") {
              id
              propertyId
              startTime
              endTime
            }
          }
        `,
      );

      expect(result).to.deep.equal({
        data: {
          bookingById: {
            endTime: '2016-06-03',
            id: 'b1',
            propertyId: 'p1',
            startTime: '2016-05-04',
          },
        },
      });
    });

    it('should error on removed types', async () => {
      const result = await graphql(
        schema,
        `
          query {
            bookingById(id: "b1") {
              id
              propertyId
              startTime
              endTime
              customer {
                id
              }
            }
          }
        `,
      );
      expect(result).to.deep.equal({
        errors: [
          {
            locations: [
              {
                column: 15,
                line: 8,
              },
            ],
            message: 'Cannot query field "customer" on type "Booking".',
            path: undefined,
          },
        ],
      });
    });
  });
});
