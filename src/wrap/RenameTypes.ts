import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLScalarType,
  GraphQLUnionType,
  Kind,
  NamedTypeNode,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
  visit,
} from 'graphql';

import { isSpecifiedScalarType, toConfig } from '../polyfills';
import { Transform, Request, Result, MapperKind } from '../Interfaces';
import { mapSchema } from '../utils';

export type RenameOptions = {
  renameBuiltins: boolean;
  renameScalars: boolean;
};

export default class RenameTypes implements Transform {
  private readonly renamer: (name: string) => string | undefined;
  private map: { [key: string]: string };
  private reverseMap: { [key: string]: string };
  private readonly renameBuiltins: boolean;
  private readonly renameScalars: boolean;

  constructor(
    renamer: (name: string) => string | undefined,
    options?: RenameOptions,
  ) {
    this.renamer = renamer;
    this.map = {};
    this.reverseMap = {};
    const { renameBuiltins = false, renameScalars = true } =
      options != null ? options : {};
    this.renameBuiltins = renameBuiltins;
    this.renameScalars = renameScalars;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return mapSchema(originalSchema, {
      [MapperKind.TYPE]: (type: GraphQLNamedType) => {
        if (isSpecifiedScalarType(type) && !this.renameBuiltins) {
          return undefined;
        }
        if (isScalarType(type) && !this.renameScalars) {
          return undefined;
        }
        const oldName = type.name;
        const newName = this.renamer(oldName);
        if (newName && newName !== oldName) {
          this.map[oldName] = type.name;
          this.reverseMap[newName] = oldName;

          const newConfig = {
            ...toConfig(type),
            name: newName,
          };

          if (isObjectType(type)) {
            return new GraphQLObjectType(newConfig);
          } else if (isInterfaceType(type)) {
            return new GraphQLInterfaceType(newConfig);
          } else if (isUnionType(type)) {
            return new GraphQLUnionType(newConfig);
          } else if (isInputObjectType(type)) {
            return new GraphQLInputObjectType(newConfig);
          } else if (isEnumType(type)) {
            return new GraphQLEnumType(newConfig);
          } else if (isScalarType(type)) {
            return new GraphQLScalarType(newConfig);
          }

          throw new Error(`Unknown type ${type as string}.`);
        }
      },

      [MapperKind.ROOT_OBJECT]() {
        return undefined;
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
