import { visit, GraphQLSchema, NamedTypeNode, Kind } from 'graphql';

import {
  Request,
  ExecutionResult,
  MapperKind,
  Transform,
  mapSchema,
  renameType,
  visitData,
} from '@graphql-tools/utils';

export default class RenameRootTypes implements Transform {
  private readonly renamer: (name: string) => string | undefined;
  private map: Record<string, string>;
  private reverseMap: Record<string, string>;

  constructor(renamer: (name: string) => string | undefined) {
    this.renamer = renamer;
    this.map = Object.create(null);
    this.reverseMap = Object.create(null);
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return mapSchema(originalSchema, {
      [MapperKind.ROOT_OBJECT]: type => {
        const oldName = type.name;
        const newName = this.renamer(oldName);
        if (newName !== undefined && newName !== oldName) {
          this.map[oldName] = newName;
          this.reverseMap[newName] = oldName;

          return renameType(type, newName);
        }
      },
    });
  }

  public transformRequest(originalRequest: Request): Request {
    const document = visit(originalRequest.document, {
      [Kind.NAMED_TYPE]: (node: NamedTypeNode) => {
        const name = node.name.value;
        if (name in this.reverseMap) {
          return {
            ...node,
            name: {
              kind: Kind.NAME,
              value: this.reverseMap[name],
            },
          };
        }
      },
    });
    return {
      ...originalRequest,
      document,
    };
  }

  public transformResult(result: ExecutionResult): ExecutionResult {
    return {
      ...result,
      data: visitData(result.data, object => {
        const typeName = object?.__typename;
        if (typeName != null && typeName in this.map) {
          object.__typename = this.map[typeName];
        }
        return object;
      }),
    };
  }
}
