import {
  GraphQLSchema,
  GraphQLOutputType,
  SelectionSetNode,
  FieldNode,
  DocumentNode,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
  FragmentDefinitionNode,
  GraphQLObjectType,
  VariableDefinitionNode,
  OperationTypeNode,
  GraphQLError,
} from 'graphql';

import DataLoader from 'dataloader';

import { Request, TypeMap, ExecutionResult } from '@graphql-tools/utils';

import { Subschema } from './Subschema';
import { OBJECT_SUBSCHEMA_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL, UNPATHED_ERRORS_SYMBOL } from './symbols';

export type SchemaTransform = (
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig,
  transformedSchema?: GraphQLSchema
) => GraphQLSchema;
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
  onLocatedError?: (originalError: GraphQLError) => GraphQLError;
  transforms: Array<Transform>;
  transformedSchema: GraphQLSchema;
  skipTypeMerging: boolean;
}

export type DelegationBinding = (delegationContext: DelegationContext) => Array<Transform>;

export interface IDelegateToSchemaOptions<TContext = Record<string, any>, TArgs = Record<string, any>> {
  schema: GraphQLSchema | SubschemaConfig;
  operationName?: string;
  operation?: OperationTypeNode;
  fieldName?: string;
  returnType?: GraphQLOutputType;
  onLocatedError?: (originalError: GraphQLError) => GraphQLError;
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
  operation: OperationTypeNode;
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
  targetOperation: OperationTypeNode;
  targetOperationName?: string;
  targetFieldName: string;
  selectionSet?: SelectionSetNode;
  fieldNodes?: ReadonlyArray<FieldNode>;
}

export interface MergedTypeInfo {
  typeName: string;
  selectionSet?: SelectionSetNode;
  targetSubschemas: Map<Subschema, Array<Subschema>>;
  uniqueFields: Record<string, Subschema>;
  nonUniqueFields: Record<string, Array<Subschema>>;
  typeMaps: Map<GraphQLSchema | SubschemaConfig, TypeMap>;
  selectionSets: Map<Subschema, SelectionSetNode>;
  fieldSelectionSets: Map<Subschema, Record<string, SelectionSetNode>>;
  resolvers: Map<Subschema, MergedTypeResolver>;
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
export type Executor = <TReturn = Record<string, any>, TArgs = Record<string, any>, TContext = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => ExecutionResult<TReturn> | Promise<ExecutionResult<TReturn>>;
export type Subscriber = <TReturn = Record<string, any>, TArgs = Record<string, any>, TContext = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => Promise<AsyncIterator<ExecutionResult<TReturn>> | ExecutionResult<TReturn>>;

export interface ICreateProxyingResolverOptions {
  subschemaConfig: SubschemaConfig;
  transformedSchema?: GraphQLSchema;
  operation?: OperationTypeNode;
  fieldName?: string;
}

export type CreateProxyingResolverFn = (options: ICreateProxyingResolverOptions) => GraphQLFieldResolver<any, any>;

export interface BatchingOptions<K = any, V = any, C = K> {
  extensionsReducer?: (mergedExtensions: Record<string, any>, executionParams: ExecutionParams) => Record<string, any>;
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
}

export interface SubschemaConfig<K = any, V = any, C = K> {
  schema: GraphQLSchema;
  createProxyingResolver?: CreateProxyingResolverFn;
  transforms?: Array<Transform>;
  merge?: Record<string, MergedTypeConfig>;
  rootValue?: Record<string, any>;
  executor?: Executor;
  subscriber?: Subscriber;
  batch?: boolean;
  batchingOptions?: BatchingOptions<K, V, C>;
}

export interface MergedTypeConfig<K = any, V = any> extends MergedTypeAccessor<K, V> {
  accessors?: Array<MergedTypeAccessor>;
  fields?: Record<string, MergedFieldConfig>;
  computedFields?: Record<string, { selectionSet?: string }>;
  canonical?: boolean;
}

export interface MergedTypeAccessor<K = any, V = any> extends MergedTypeResolverOptions<K, V> {
  selectionSet?: string;
  key?: (originalResult: any) => K;
  resolve?: MergedTypeResolver;
}

export interface MergedTypeResolverOptions<K = any, V = any> {
  fieldName?: string;
  args?: (originalResult: any) => Record<string, any>;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>;
}

export interface MergedFieldConfig {
  selectionSet?: string;
  computed?: boolean;
  canonical?: boolean;
}

export type MergedTypeResolver = (
  originalResult: any,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  subschema: GraphQLSchema | SubschemaConfig,
  selectionSet: SelectionSetNode,
  key?: any
) => any;

export interface StitchingInfo {
  subschemaMap: Map<GraphQLSchema | SubschemaConfig, Subschema>;
  selectionSetsByType: Record<string, SelectionSetNode>;
  selectionSetsByField: Record<string, Record<string, SelectionSetNode>>;
  dynamicSelectionSetsByField: Record<string, Record<string, Array<(node: FieldNode) => SelectionSetNode>>>;
  mergedTypes: Record<string, MergedTypeInfo>;
}

export interface ExternalObject {
  key: any;
  [OBJECT_SUBSCHEMA_SYMBOL]: GraphQLSchema | SubschemaConfig;
  [FIELD_SUBSCHEMA_MAP_SYMBOL]: Record<string, GraphQLSchema | SubschemaConfig>;
  [UNPATHED_ERRORS_SYMBOL]: Array<GraphQLError>;
}
