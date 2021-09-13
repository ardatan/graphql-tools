import { GraphQLSchema } from 'graphql';
import { ExecutionRequest } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
import { InputFieldTransformer, InputFieldNodeTransformer, InputObjectNodeTransformer } from '../types';
export default class TransformInputObjectFields implements Transform {
  private readonly inputFieldTransformer;
  private readonly inputFieldNodeTransformer;
  private readonly inputObjectNodeTransformer;
  private transformedSchema;
  private mapping;
  constructor(
    inputFieldTransformer: InputFieldTransformer,
    inputFieldNodeTransformer?: InputFieldNodeTransformer,
    inputObjectNodeTransformer?: InputObjectNodeTransformer
  );
  private _getTransformedSchema;
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionRequest;
  private transformDocument;
}
