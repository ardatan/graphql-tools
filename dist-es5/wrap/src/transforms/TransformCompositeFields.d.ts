import { GraphQLSchema } from 'graphql';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
import { FieldTransformer, FieldNodeTransformer, DataTransformer, ErrorsTransformer } from '../types';
export default class TransformCompositeFields<TContext = Record<string, any>> implements Transform<any, TContext> {
  private readonly fieldTransformer;
  private readonly fieldNodeTransformer;
  private readonly dataTransformer;
  private readonly errorsTransformer;
  private transformedSchema;
  private typeInfo;
  private mapping;
  private subscriptionTypeName;
  constructor(
    fieldTransformer: FieldTransformer,
    fieldNodeTransformer?: FieldNodeTransformer,
    dataTransformer?: DataTransformer,
    errorsTransformer?: ErrorsTransformer
  );
  private _getTypeInfo;
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
  transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionRequest;
  transformResult(
    result: ExecutionResult,
    _delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionResult;
  private transformDocument;
  private transformSelectionSet;
}
