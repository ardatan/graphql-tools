import {
  visit,
  GraphQLSchema,
  NamedTypeNode,
  Kind,
  GraphQLNamedType,
  GraphQLScalarType,
} from 'graphql';
import isSpecifiedScalarType from '../isSpecifiedScalarType';
import { Request, Result } from '../Interfaces';
import { Transform } from '../transforms/transforms';
import { visitSchema, VisitSchemaKind } from '../transforms/visitSchema';

export type RenameOptions = {
  renameBuiltins: boolean;
  renameScalars: boolean;
};

export default class RenameTypes implements Transform {
  private renamer: (name: string) => string | undefined;
  private reverseMap: { [key: string]: string };
  private renameBuiltins: boolean;
  private renameScalars: boolean;

  constructor(
    renamer: (name: string) => string | undefined,
    options?: RenameOptions,
  ) {
    this.renamer = renamer;
    this.reverseMap = {};
    const { renameBuiltins = false, renameScalars = true } = options || {};
    this.renameBuiltins = renameBuiltins;
    this.renameScalars = renameScalars;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return visitSchema(originalSchema, {
      [VisitSchemaKind.TYPE]: (type: GraphQLNamedType) => {
        if (isSpecifiedScalarType(type) && !this.renameBuiltins) {
          return undefined;
        }
        if (type instanceof GraphQLScalarType && !this.renameScalars) {
          return undefined;
        }
        const newName = this.renamer(type.name);
        if (newName && newName !== type.name) {
          this.reverseMap[newName] = type.name;
          const newType = Object.assign(Object.create(type), type);
          newType.name = newName;
          return newType;
        }
      },

      [VisitSchemaKind.ROOT_OBJECT](type: GraphQLNamedType) {
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
    if (result.data) {
      const data = this.renameTypes(result.data, 'data');
      if (data !== result.data) {
        return { ...result, data };
      }
    }

    return result;
  }

  private renameTypes(value: any, name?: string) {
    if (name === '__typename') {
      return this.renamer(value);
    }

    if (value && typeof value === 'object') {
      const newObject = Object.create(Object.getPrototypeOf(value));
      let returnNewObject = false;

      if (newObject instanceof Array) {
        value.forEach((oldChild: any) => {
          const newChild = this.renameTypes(oldChild);
          newObject.push(newChild);
          if (newChild !== oldChild) {
            returnNewObject = true;
          }
        });
      } else {
        Object.keys(value).forEach(key => {
          const oldChild = value[key];
          const newChild = this.renameTypes(oldChild, key);
          newObject[key] = newChild;
          if (newChild !== oldChild) {
            returnNewObject = true;
          }
        });
      }

      if (returnNewObject) {
        return newObject;
      }
    }

    return value;
  }
}
