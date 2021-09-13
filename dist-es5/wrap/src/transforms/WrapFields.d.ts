import { GraphQLSchema } from 'graphql';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
interface WrapFieldsTransformationContext {
  nextIndex: number;
  paths: Record<
    string,
    {
      pathToField: Array<string>;
      alias: string;
    }
  >;
}
export default class WrapFields<TContext> implements Transform<WrapFieldsTransformationContext, TContext> {
  private readonly outerTypeName;
  private readonly wrappingFieldNames;
  private readonly wrappingTypeNames;
  private readonly numWraps;
  private readonly fieldNames;
  private readonly transformer;
  constructor(
    outerTypeName: string,
    wrappingFieldNames: Array<string>,
    wrappingTypeNames: Array<string>,
    fieldNames?: Array<string>,
    prefix?: string
  );
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: WrapFieldsTransformationContext
  ): ExecutionRequest;
  transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: WrapFieldsTransformationContext
  ): ExecutionResult;
}
export declare function dehoistValue(originalValue: any, context: WrapFieldsTransformationContext): any;
export {};
