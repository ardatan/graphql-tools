import {
  visit,
  GraphQLSchema,
  NamedTypeNode,
  Kind,
  GraphQLObjectType,
} from 'graphql';

import { Request, Result, MapperKind, Transform } from '../../Interfaces';
import { mapSchema } from '../../utils';
import { toConfig } from '../../polyfills';

export default class RenameRootTypes implements Transform {
  private readonly renamer: (name: string) => string | undefined;
  private map: { [key: string]: string };
  private reverseMap: { [key: string]: string };

  constructor(renamer: (name: string) => string | undefined) {
    this.renamer = renamer;
    this.map = {};
    this.reverseMap = {};
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return mapSchema(originalSchema, {
      [MapperKind.ROOT_OBJECT]: type => {
        const oldName = type.name;
        const newName = this.renamer(oldName);
        if (newName && newName !== oldName) {
          this.map[oldName] = type.name;
          this.reverseMap[newName] = oldName;
          return new GraphQLObjectType({
            ...toConfig(type),
            name: newName,
          });
        }
      },
    });
  }

  public transformRequest(originalRequest: Request): Request {
    const newDocument = visit(originalRequest.document, {
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
      document: newDocument,
      variables: originalRequest.variables,
    };
  }

  public transformResult(result: Result): Result {
    return {
      ...result,
      data: this.renameTypes(result.data),
    };
  }

  private renameTypes(value: any): any {
    if (value == null) {
      return value;
    } else if (Array.isArray(value)) {
      value.forEach((v, index) => {
        value[index] = this.renameTypes(v);
      });
      return value;
    } else if (typeof value === 'object') {
      Object.keys(value).forEach(key => {
        value[key] =
          key === '__typename'
            ? this.renamer(value[key])
            : this.renameTypes(value[key]);
      });
      return value;
    }

    return value;
  }
}
