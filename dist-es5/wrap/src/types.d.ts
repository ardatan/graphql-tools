import {
  GraphQLInputFieldConfig,
  GraphQLFieldConfig,
  FieldNode,
  FragmentDefinitionNode,
  SelectionNode,
  ObjectFieldNode,
  ObjectValueNode,
  GraphQLError,
  GraphQLEnumValueConfig,
} from 'graphql';
import { DelegationContext } from '@graphql-tools/delegate';
import { ExecutionRequest, Maybe } from '@graphql-tools/utils';
export declare type InputFieldTransformer = (
  typeName: string,
  fieldName: string,
  inputFieldConfig: GraphQLInputFieldConfig
) => GraphQLInputFieldConfig | [string, GraphQLInputFieldConfig] | null | undefined;
export declare type InputFieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  inputFieldNode: ObjectFieldNode,
  request: ExecutionRequest,
  delegationContext?: DelegationContext
) => ObjectFieldNode | Array<ObjectFieldNode>;
export declare type InputObjectNodeTransformer = (
  typeName: string,
  inputObjectNode: ObjectValueNode,
  request: ExecutionRequest,
  delegationContext?: DelegationContext
) => ObjectValueNode | undefined;
export declare type FieldTransformer<TContext = Record<string, any>> = (
  typeName: string,
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, TContext>
) => Maybe<GraphQLFieldConfig<any, TContext> | [string, GraphQLFieldConfig<any, TContext>]>;
export declare type RootFieldTransformer<TContext = Record<string, any>> = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, TContext>
) => Maybe<GraphQLFieldConfig<any, TContext> | [string, GraphQLFieldConfig<any, TContext>]>;
export declare type EnumValueTransformer = (
  typeName: string,
  externalValue: string,
  enumValueConfig: GraphQLEnumValueConfig
) => Maybe<GraphQLEnumValueConfig | [string, GraphQLEnumValueConfig]>;
export declare type FieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
  transformationContext: Record<string, any>
) => Maybe<SelectionNode | Array<SelectionNode>>;
export declare type LeafValueTransformer = (typeName: string, value: any) => any;
export declare type DataTransformer = (value: any, transformationContext: Record<string, any>) => any;
export declare type ObjectValueTransformerMap = Record<string, DataTransformer>;
export declare type ErrorsTransformer = (
  errors: ReadonlyArray<GraphQLError> | undefined,
  transformationContext: Record<string, any>
) => Array<GraphQLError> | undefined;
