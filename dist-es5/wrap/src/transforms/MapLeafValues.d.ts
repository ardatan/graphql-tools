import { GraphQLSchema } from 'graphql';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
import { LeafValueTransformer } from '../types';
export interface MapLeafValuesTransformationContext {
  transformedRequest: ExecutionRequest;
}
export default class MapLeafValues implements Transform<MapLeafValuesTransformationContext> {
  private readonly inputValueTransformer;
  private readonly outputValueTransformer;
  private readonly resultVisitorMap;
  private originalWrappingSchema;
  private typeInfo;
  constructor(inputValueTransformer: LeafValueTransformer, outputValueTransformer: LeafValueTransformer);
  private _getTypeInfo;
  private _getOriginalWrappingSchema;
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
  transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext,
    transformationContext: MapLeafValuesTransformationContext
  ): ExecutionRequest;
  transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext,
    transformationContext: MapLeafValuesTransformationContext
  ): ExecutionResult;
  private transformOperations;
  private transformFieldNode;
}
