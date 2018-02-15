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
import { Request } from '../Interfaces';
import { Transform } from '../transforms/transforms';
import { visitSchema, VisitSchemaKind } from '../transforms/visitSchema';
import { propertySchema } from './testingSchemas';
import makeSimpleTransformSchema from '../transforms/makeSimpleTransformSchema';

function RenameTypes(renameMap: { [originalName: string]: string }): Transform {
  const reverseMap = {};
  Object.keys(renameMap).map(from => {
    reverseMap[renameMap[from]] = from;
  });
  return {
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
      return visitSchema(originalSchema, {
        [VisitSchemaKind.TYPE](
          type: GraphQLNamedType,
        ): GraphQLNamedType | undefined {
          if (type.name in renameMap) {
            const newType = Object.assign(Object.create(type), type);
            newType.name = renameMap[type.name];
            return newType;
          }
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
  };
}

// function NamespaceSchema(namespace: string): Transform {
//   return {
//     transformSchema();,
//   };
// }

// function importFromSchema(importString: string) {}
//
//

describe('transforms', () => {
  describe('rename type', () => {
    let schema: GraphQLSchema;
    before(() => {
      const transforms = [
        RenameTypes({
          Property: 'House',
          Location: 'Spots',
          TestInterface: 'TestingInterface',
          DateTime: 'Datum',
          InputWithDefault: 'DefaultingInput',
          TestInterfaceKind: 'TestingInterfaceKinds',
        }),
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
});
