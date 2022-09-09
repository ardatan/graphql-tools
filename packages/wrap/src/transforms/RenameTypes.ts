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
  ExecutionRequest,
  ExecutionResult,
  MapperKind,
  RenameTypesOptions,
  mapSchema,
  visitData,
  renameType,
} from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

interface RenameTypesTransformationContext extends Record<string, any> {}

export default class RenameTypes<TContext = Record<string, any>>
  implements Transform<RenameTypesTransformationContext, TContext>
{
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

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    const typeNames = new Set<string>(Object.keys(originalWrappingSchema.getTypeMap()));
    return mapSchema(originalWrappingSchema, {
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
          if (typeNames.has(newName)) {
            console.warn(`New type name ${newName} for ${oldName} already exists in the schema. Skip renaming.`);
            return;
          }
          this.map[oldName] = newName;
          this.reverseMap[newName] = oldName;

          typeNames.delete(oldName);
          typeNames.add(newName);

          return renameType(type, newName);
        }
      },

      [MapperKind.ROOT_OBJECT]() {
        return undefined;
      },
    });
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext: RenameTypesTransformationContext
  ): ExecutionRequest {
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
    _delegationContext: DelegationContext<TContext>,
    _transformationContext?: RenameTypesTransformationContext
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
