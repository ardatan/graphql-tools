import {
  visit,
  GraphQLSchema,
  NamedTypeNode,
  Kind,
  GraphQLNamedType,
} from 'graphql';
import { Request, Result } from '../Interfaces';
import { Transform } from '../transforms/transforms';
import { visitSchema, VisitSchemaKind } from '../transforms/visitSchema';
import visitObject from '../transforms/visitObject';

export default function RenameTypes(
  renamer: (name: string) => string | undefined,
): Transform {
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
