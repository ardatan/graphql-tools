import { GraphQLSchema, FieldNode, GraphQLArgument } from 'graphql';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
export default class HoistField implements Transform {
  private readonly typeName;
  private readonly newFieldName;
  private readonly pathToField;
  private readonly oldFieldName;
  private readonly argFilters;
  private readonly argLevels;
  private readonly transformer;
  constructor(
    typeName: string,
    pathConfig: Array<
      | string
      | {
          fieldName: string;
          argFilter?: (arg: GraphQLArgument) => boolean;
        }
    >,
    newFieldName: string,
    alias?: string
  );
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionRequest;
  transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionResult;
}
export declare function wrapFieldNode(
  fieldNode: FieldNode,
  path: Array<string>,
  alias: string,
  argLevels: Record<string, number>
): FieldNode;
export declare function renameFieldNode(fieldNode: FieldNode, name: string): FieldNode;
export declare function unwrapValue(originalValue: any, alias: string): any;
