import {
  GraphQLSchema,
  GraphQLOutputType,
  SelectionSetNode,
  FieldNode,
  DocumentNode,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
  InlineFragmentNode,
  FragmentDefinitionNode,
  GraphQLObjectType,
  VariableDefinitionNode,
  OperationTypeNode,
  GraphQLError,
} from 'graphql';

import DataLoader from 'dataloader';

import { Operation, Request, TypeMap, ExecutionResult, UNPATHED_ERRORS_SYMBOL } from '@graphql-tools/utils';

import { Subschema } from './Subschema';
import { OBJECT_SUBSCHEMA_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL } from './symbols';

export type SchemaTransform = (originalSchema: GraphQLSchema) => GraphQLSchema;
export type RequestTransform<T = Record<string, any>> = (
  originalRequest: Request,
  delegationContext: DelegationContext,
  transformationContext: T
) => Request;
export type ResultTransform<T = Record<string, any>> = (
  originalResult: ExecutionResult,
  delegationContext: DelegationContext,
  transformationContext: T
) => ExecutionResult;

export interface Transform<T = Record<string, any>> {
  transformSchema?: SchemaTransform;
  transformRequest?: RequestTransform<T>;
  transformResult?: ResultTransform<T>;
}

export interface DelegationContext {
  subschema: GraphQLSchema | SubschemaConfig;
  targetSchema: GraphQLSchema;
  operation: OperationTypeNode;
  fieldName: string;
  args: Record<string, any>;
  context: Record<string, any>;
  info: GraphQLResolveInfo;
  returnType: GraphQLOutputType;
  transforms: Array<Transform>;
  transformedSchema: GraphQLSchema;
  skipTypeMerging: boolean;
}

export type DelegationBinding = (delegationContext: DelegationContext) => Array<Transform>;

export interface IDelegateToSchemaOptions<TContext = Record<string, any>, TArgs = Record<string, any>> {
  schema: GraphQLSchema | SubschemaConfig | Subschema;
  operationName?: string;
  operation?: Operation;
  fieldName?: string;
  returnType?: GraphQLOutputType;
  args?: TArgs;
  selectionSet?: SelectionSetNode;
  fieldNodes?: ReadonlyArray<FieldNode>;
  context?: TContext;
  info: GraphQLResolveInfo;
  rootValue?: Record<string, any>;
  transforms?: Array<Transform>;
  transformedSchema?: GraphQLSchema;
  skipValidation?: boolean;
  skipTypeMerging?: boolean;
  binding?: DelegationBinding;
}

export interface IDelegateRequestOptions extends Omit<IDelegateToSchemaOptions, 'info'> {
  request: Request;
  info?: GraphQLResolveInfo;
}

export interface ICreateRequestFromInfo {
  info: GraphQLResolveInfo;
  operationName?: string;
  operation: Operation;
  fieldName: string;
  selectionSet?: SelectionSetNode;
  fieldNodes?: ReadonlyArray<FieldNode>;
}

export interface ICreateRequest {
  sourceSchema?: GraphQLSchema;
  sourceParentType?: GraphQLObjectType;
  sourceFieldName?: string;
  fragments?: Record<string, FragmentDefinitionNode>;
  variableDefinitions?: ReadonlyArray<VariableDefinitionNode>;
  variableValues?: Record<string, any>;
  targetOperation: Operation;
  targetOperationName?: string;
  targetFieldName: string;
  selectionSet?: SelectionSetNode;
  fieldNodes?: ReadonlyArray<FieldNode>;
}

export interface MergedTypeInfo {
  typeName: string;
  selectionSet?: SelectionSetNode;
  targetSubschemas: Map<GraphQLSchema | SubschemaConfig, Array<SubschemaConfig>>;
  uniqueFields: Record<string, SubschemaConfig>;
  nonUniqueFields: Record<string, Array<SubschemaConfig>>;
  typeMaps: Map<GraphQLSchema | SubschemaConfig, TypeMap>;
  selectionSets: Map<SubschemaConfig, SelectionSetNode>;
  fieldSelectionSets: Map<SubschemaConfig, Record<string, SelectionSetNode>>;
}

export interface ExecutionParams<TArgs = Record<string, any>, TContext = any> {
  document: DocumentNode;
  variables?: TArgs;
  extensions?: Record<string, any>;
  context?: TContext;
  info?: GraphQLResolveInfo;
}

export type AsyncExecutor = <
  TReturn = Record<string, any>,
  TArgs = Record<string, any>,
  TContext = Record<string, any>
>(
  params: ExecutionParams<TArgs, TContext>
) => Promise<ExecutionResult<TReturn>>;
export type SyncExecutor = <TReturn = Record<string, any>, TArgs = Record<string, any>, TContext = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => ExecutionResult<TReturn>;
export type Executor = AsyncExecutor | SyncExecutor;
export type Subscriber = <TReturn = Record<string, any>, TArgs = Record<string, any>, TContext = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => Promise<AsyncIterator<ExecutionResult<TReturn>> | ExecutionResult<TReturn>>;

export interface ICreateProxyingResolverOptions {
  schema: GraphQLSchema | SubschemaConfig;
  transforms?: Array<Transform>;
  transformedSchema?: GraphQLSchema;
  operation?: Operation;
  fieldName?: string;
}

export type CreateProxyingResolverFn = (options: ICreateProxyingResolverOptions) => GraphQLFieldResolver<any, any>;

export interface Endpoint<K = any, V = any, C = K> {
  rootValue?: Record<string, any>;
  executor?: Executor;
  subscriber?: Subscriber;
  batch?: boolean;
  batchingOptions?: {
    extensionsReducer?: (
      mergedExtensions: Record<string, any>,
      executionParams: ExecutionParams
    ) => Record<string, any>;
    dataLoaderOptions?: DataLoader.Options<K, V, C>;
  };
}

export interface SubschemaPermutation {
  createProxyingResolver?: CreateProxyingResolverFn;
  transforms?: Array<Transform>;
  merge?: Record<string, MergedTypeConfig>;
}

export interface SubschemaConfig<K = any, V = any, C = K> extends SubschemaPermutation, Endpoint<K, V, C> {
  schema: GraphQLSchema;
  endpoint?: Endpoint;
}

export interface MergedTypeConfig<K = any, V = any> {
  selectionSet?: string;
  fields?: Record<string, { selectionSet?: string }>;
  resolve?: MergedTypeResolver;
  fieldName?: string;
  args?: (originalResult: any) => Record<string, any>;
  key?: (originalResult: any) => K;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>;
}

export type MergedTypeResolver = (
  originalResult: any,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  subschema: GraphQLSchema | SubschemaConfig,
  selectionSet: SelectionSetNode
) => any;

export interface StitchingInfo {
  transformedSchemas: Map<GraphQLSchema | SubschemaConfig, GraphQLSchema>;
  fragmentsByField: Record<string, Record<string, InlineFragmentNode>>;
  selectionSetsByField: Record<string, Record<string, SelectionSetNode>>;
  dynamicSelectionSetsByField: Record<string, Record<string, Array<(node: FieldNode) => SelectionSetNode>>>;
  mergedTypes: Record<string, MergedTypeInfo>;
  endpoints: Record<string, Endpoint>;
}

export interface ExternalData {
  key: any;
  [OBJECT_SUBSCHEMA_SYMBOL]: GraphQLSchema | SubschemaConfig;
  [FIELD_SUBSCHEMA_MAP_SYMBOL]: Record<string, GraphQLSchema | SubschemaConfig>;
  [UNPATHED_ERRORS_SYMBOL]: Array<GraphQLError>;
}
