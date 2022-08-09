import { visit, GraphQLSchema, NamedTypeNode, Kind } from 'graphql';

import { ExecutionRequest, ExecutionResult, MapperKind, mapSchema, renameType, visitData } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

interface RenameRootTypesTransformationContext extends Record<string, any> {}

export default class RenameRootTypes<TContext = Record<string, any>>
  implements Transform<RenameRootTypesTransformationContext, TContext>
{
  private readonly renamer: (name: string) => string | undefined;
  private map: Record<string, string>;
  private reverseMap: Record<string, string>;

  constructor(renamer: (name: string) => string | undefined) {
    this.renamer = renamer;
    this.map = Object.create(null);
    this.reverseMap = Object.create(null);
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    return mapSchema(originalWrappingSchema, {
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

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext: RenameRootTypesTransformationContext
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
    _transformationContext?: RenameRootTypesTransformationContext
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
