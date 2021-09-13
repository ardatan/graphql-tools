import { GraphQLSchema } from 'graphql';
import { ExecutionRequest, FieldNodeMappers, ExecutionResult } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
import { ObjectValueTransformerMap, ErrorsTransformer } from '../types';
export default class MapFields<TContext> implements Transform<any, TContext> {
  private fieldNodeTransformerMap;
  private objectValueTransformerMap?;
  private errorsTransformer?;
  private transformer;
  constructor(
    fieldNodeTransformerMap: FieldNodeMappers,
    objectValueTransformerMap?: ObjectValueTransformerMap,
    errorsTransformer?: ErrorsTransformer
  );
  private _getTransformer;
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
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
