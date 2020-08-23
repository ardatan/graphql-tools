import {
  GraphQLNamedType,
  GraphQLSchema,
  Kind,
  NamedTypeNode,
  isScalarType,
  isSpecifiedScalarType,
  visit,
} from 'graphql';

import {
  Request,
  ExecutionResult,
  MapperKind,
  RenameTypesOptions,
  mapSchema,
  visitData,
  renameType,
} from '@graphql-tools/utils';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

export default class RenameTypes implements Transform {
  private readonly renamer: (name: string) => string | undefined;
  private map: Record<string, string>;
  private reverseMap: Record<string, string>;
  private readonly renameBuiltins: boolean;
  private readonly renameScalars: boolean;

  constructor(renamer: (name: string) => string | undefined, options?: RenameTypesOptions) {
    this.renamer = renamer;
    this.map = Object.create(null);
    this.reverseMap = Object.create(null);
    const { renameBuiltins = false, renameScalars = true } = options != null ? options : {};
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
        if (newName !== undefined && newName !== oldName) {
          this.map[oldName] = newName;
          this.reverseMap[newName] = oldName;

          return renameType(type, newName);
        }
      },

      [MapperKind.ROOT_OBJECT]() {
        return undefined;
      },
    });
  }

  public transformRequest(
    originalRequest: Request,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
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

  public transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext,
    _transformationContext?: Record<string, any>
  ): ExecutionResult {
    return {
      ...originalResult,
      data: visitData(originalResult.data, object => {
        const typeName = object?.__typename;
        if (typeName != null && typeName in this.map) {
          object.__typename = this.map[typeName];
        }
        return object;
      }),
    };
  }
}
