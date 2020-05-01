import {
  GraphQLSchema,
  GraphQLFieldResolver,
  BuildSchemaOptions,
  GraphQLField,
  GraphQLFieldConfig,
  FieldNode,
  FragmentDefinitionNode,
  SelectionNode,
} from 'graphql';
import { Executor, Subscriber } from '@graphql-tools/delegate';

export interface IMakeRemoteExecutableSchemaOptions {
  schema: GraphQLSchema | string;
  executor?: Executor;
  subscriber?: Subscriber;
  createResolver?: (executor: Executor, subscriber: Subscriber) => GraphQLFieldResolver<any, any>;
  buildSchemaOptions?: BuildSchemaOptions;
}

export interface RenamedFieldConfig {
  name: string;
  field?: GraphQLFieldConfig<any, any>;
}

export type FieldTransformer = (
  typeName: string,
  fieldName: string,
  field: GraphQLField<any, any>
) => GraphQLFieldConfig<any, any> | RenamedFieldConfig | null | undefined;

export type RootFieldTransformer = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>
) => GraphQLFieldConfig<any, any> | RenamedFieldConfig | null | undefined;

export type FieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>
) => SelectionNode | Array<SelectionNode>;
