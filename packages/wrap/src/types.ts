import {
  GraphQLSchema,
  GraphQLFieldResolver,
  BuildSchemaOptions,
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
import { Executor, Subscriber, DelegationContext } from '@graphql-tools/delegate';
import { Request } from '@graphql-tools/utils';

export interface IMakeRemoteExecutableSchemaOptions {
  schema: GraphQLSchema | string;
  executor?: Executor;
  subscriber?: Subscriber;
  createResolver?: (executor: Executor, subscriber: Subscriber) => GraphQLFieldResolver<any, any>;
  buildSchemaOptions?: BuildSchemaOptions;
}

export type InputFieldTransformer = (
  typeName: string,
  fieldName: string,
  inputFieldConfig: GraphQLInputFieldConfig
) => GraphQLInputFieldConfig | [string, GraphQLInputFieldConfig] | null | undefined;

export type InputFieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  inputFieldNode: ObjectFieldNode,
  request: Request,
  delegationContext?: DelegationContext
) => ObjectFieldNode | Array<ObjectFieldNode>;

export type InputObjectNodeTransformer = (
  typeName: string,
  inputObjectNode: ObjectValueNode,
  request: Request,
  delegationContext?: DelegationContext
) => ObjectValueNode;

export type FieldTransformer = (
  typeName: string,
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, any>
) => GraphQLFieldConfig<any, any> | [string, GraphQLFieldConfig<any, any>] | null | undefined;

export type RootFieldTransformer = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, any>
) => GraphQLFieldConfig<any, any> | [string, GraphQLFieldConfig<any, any>] | null | undefined;

export type EnumValueTransformer = (
  typeName: string,
  externalValue: string,
  enumValueConfig: GraphQLEnumValueConfig
) => GraphQLEnumValueConfig | [string, GraphQLEnumValueConfig] | null | undefined;

export type FieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
  transformationContext: Record<string, any>
) => SelectionNode | Array<SelectionNode>;

export type LeafValueTransformer = (typeName: string, value: any) => any;

export type DataTransformer = (value: any, transformationContext?: Record<string, any>) => any;

export type ObjectValueTransformerMap = Record<string, DataTransformer>;

export type ErrorsTransformer = (
  errors: ReadonlyArray<GraphQLError>,
  transformationContext: Record<string, any>
) => Array<GraphQLError>;
