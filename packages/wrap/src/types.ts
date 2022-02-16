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

export type InputFieldTransformer = (
  typeName: string,
  fieldName: string,
  inputFieldConfig: GraphQLInputFieldConfig
) => GraphQLInputFieldConfig | [string, GraphQLInputFieldConfig] | null | undefined;

export type InputFieldNodeTransformer = <TContext>(
  typeName: string,
  fieldName: string,
  inputFieldNode: ObjectFieldNode,
  request: ExecutionRequest,
  delegationContext?: DelegationContext<TContext>
) => ObjectFieldNode | Array<ObjectFieldNode>;

export type InputObjectNodeTransformer = <TContext>(
  typeName: string,
  inputObjectNode: ObjectValueNode,
  request: ExecutionRequest,
  delegationContext?: DelegationContext<TContext>
) => ObjectValueNode | undefined;

export type FieldTransformer<TContext = Record<string, any>> = (
  typeName: string,
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, TContext>
) => Maybe<GraphQLFieldConfig<any, TContext> | [string, GraphQLFieldConfig<any, TContext>]>;

export type RootFieldTransformer<TContext = Record<string, any>> = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, TContext>
) => Maybe<GraphQLFieldConfig<any, TContext> | [string, GraphQLFieldConfig<any, TContext>]>;

export type EnumValueTransformer = (
  typeName: string,
  externalValue: string,
  enumValueConfig: GraphQLEnumValueConfig
) => Maybe<GraphQLEnumValueConfig | [string, GraphQLEnumValueConfig]>;

export type FieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
  transformationContext: Record<string, any>
) => Maybe<SelectionNode | Array<SelectionNode>>;

export type LeafValueTransformer = (typeName: string, value: any) => any;

export type DataTransformer = (value: any, transformationContext: Record<string, any>) => any;

export type ObjectValueTransformerMap = Record<string, DataTransformer>;

export type ErrorsTransformer = (
  errors: ReadonlyArray<GraphQLError> | undefined,
  transformationContext: Record<string, any>
) => Array<GraphQLError> | undefined;
