import {
  visit,
  GraphQLSchema,
  NamedTypeNode,
  Kind,
  GraphQLObjectType,
} from 'graphql';

import {
  Request,
  ExecutionResult,
  MapperKind,
  Transform,
} from '../../Interfaces';
import { mapSchema } from '../../utils/index';
import { toConfig } from '../../polyfills/index';

export default class RenameRootTypes implements Transform {
  private readonly renamer: (name: string) => string | undefined;
  private map: { [key: string]: string };
  private reverseMap: { [key: string]: string };

  constructor(renamer: (name: string) => string | undefined) {
    this.renamer = renamer;
    this.map = Object.create(null);
    this.reverseMap = Object.create(null);
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return mapSchema(originalSchema, {
      [MapperKind.ROOT_OBJECT]: (type) => {
        const oldName = type.name;
        const newName = this.renamer(oldName);
        if (newName !== undefined && newName !== oldName) {
          this.map[oldName] = newName;
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

  public transformResult(result: ExecutionResult): ExecutionResult {
    return {
      ...result,
      data: this.transformData(result.data),
    };
  }

  private transformData(data: any): any {
    if (data == null) {
      return data;
    } else if (Array.isArray(data)) {
      return data.map((value) => this.transformData(value));
    } else if (typeof data === 'object') {
      return this.transformObject(data);
    }

    return data;
  }

  private transformObject(object: Record<string, any>): Record<string, any> {
    Object.keys(object).forEach((key) => {
      const value = object[key];
      if (key === '__typename') {
        if (value in this.map) {
          object[key] = this.map[value];
        }
      } else {
        object[key] = this.transformData(value);
      }
    });

    return object;
  }
}
