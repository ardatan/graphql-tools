import { GraphQLSchema, GraphQLInputFieldConfig } from 'graphql';
import { ExecutionRequest } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
declare type RenamerFunction = (
  typeName: string,
  fieldName: string,
  inputFieldConfig: GraphQLInputFieldConfig
) => string | undefined;
export default class RenameInputObjectFields implements Transform {
  private readonly renamer;
  private readonly transformer;
  private reverseMap;
  constructor(renamer: RenamerFunction);
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
}
export {};
