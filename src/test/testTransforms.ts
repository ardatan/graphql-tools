/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import {
  visit,
  GraphQLSchema,
  NamedTypeNode,
  Kind,
  GraphQLNamedType,
  graphql,
} from 'graphql';
import { Request, Result } from '../Interfaces';
import { Transform } from '../transforms/transforms';
import { visitSchema, VisitSchemaKind } from '../transforms/visitSchema';
import visitObject from '../transforms/visitObject';
import { propertySchema } from './testingSchemas';
import makeSimpleTransformSchema from '../transforms/makeSimpleTransformSchema';

function RenameTypes(renamer: (name: string) => string | undefined): Transform {
  const reverseMap = {};
  return {
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
      return visitSchema(originalSchema, {
        [VisitSchemaKind.TYPE](
          type: GraphQLNamedType,
        ): GraphQLNamedType | undefined {
          const newName = renamer(type.name);
          if (newName && newName !== type.name) {
            reverseMap[newName] = type.name;
            const newType = Object.assign(Object.create(type), type);
            newType.name = newName;
            return newType;
          }
        },

        [VisitSchemaKind.ROOT_OBJECT](type: GraphQLNamedType) {
          return undefined;
        },
      });
    },

    transformRequest(originalRequest: Request): Request {
      const newDocument = visit(originalRequest.document, {
        [Kind.NAMED_TYPE](node: NamedTypeNode): NamedTypeNode | undefined {
          const name = node.name.value;
          if (name in reverseMap) {
            return {
              ...node,
              name: {
                kind: Kind.NAME,
                value: reverseMap[name],
              },
            };
          }
        },
      });
      return {
        document: newDocument,
        variables: originalRequest.variables,
      };
    },

    transformResult(result: Result): Result {
      if (result.data) {
        const newData = visitObject(result.data, (key, value) => {
          if (key === '__typename') {
            return renamer(value);
          }
        });
        const newResult = {
          ...result,
          data: newData,
        };
        return newResult;
      }
      return result;
    },
  };
}
//
// type ImportDefinition = {
//   types: {};
//   fields: {};
// };
//
// function importFromSchema(importString: string) {}

describe('transforms', () => {
  describe('rename type', () => {
    let schema: GraphQLSchema;
    before(() => {
      const transforms = [
        RenameTypes(
          name =>
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
      schema = makeSimpleTransformSchema(propertySchema, transforms);
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
      const transforms = [RenameTypes(name => `Property_${name}`)];
      schema = makeSimpleTransformSchema(propertySchema, transforms);
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
});
