import {
  GraphQLSchema,
  GraphQLField,
  ExecutionResult,
  GraphQLInputType,
  GraphQLType,
  GraphQLNamedType,
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  GraphQLIsTypeOfFn,
  GraphQLTypeResolver,
  GraphQLScalarType,
  DocumentNode,
  GraphQLEnumValue,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLArgument,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  InlineFragmentNode,
  GraphQLOutputType,
} from 'graphql';

import { SchemaDirectiveVisitor } from './utils/SchemaDirectiveVisitor';
import { SchemaVisitor } from './utils/SchemaVisitor';

import { ApolloLink } from 'apollo-link';

/* TODO: Add documentation */

export type UnitOrList<Type> = Type | Array<Type>;
export interface IResolverValidationOptions {
  requireResolversForArgs?: boolean;
  requireResolversForNonScalar?: boolean;
  requireResolversForAllFields?: boolean;
  requireResolversForResolveType?: boolean;
  allowResolversNotInSchema?: boolean;
}

// for backwards compatibility
export interface IAddResolveFunctionsToSchemaOptions {
  schema: GraphQLSchema;
  resolvers: IResolvers;
  defaultFieldResolver?: IFieldResolver<any, any>;
  resolverValidationOptions?: IResolverValidationOptions;
  inheritResolversFromInterfaces?: boolean;
}

export interface IAddResolversToSchemaOptions {
  schema: GraphQLSchema;
  resolvers: IResolvers;
  defaultFieldResolver?: IFieldResolver<any, any>;
  resolverValidationOptions?: IResolverValidationOptions;
  inheritResolversFromInterfaces?: boolean;
}

export interface IResolverOptions<TSource = any, TContext = any, TArgs = any> {
  fragment?: string;
  resolve?: IFieldResolver<TSource, TContext, TArgs>;
  subscribe?: IFieldResolver<TSource, TContext, TArgs>;
  __resolveType?: GraphQLTypeResolver<TSource, TContext>;
  __isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext>;
}

export type Transform = {
  transformSchema?: (schema: GraphQLSchema) => GraphQLSchema;
  transformRequest?: (originalRequest: Request) => Request;
  transformResult?: (result: Result) => Result;
};

export interface IGraphQLToolsResolveInfo extends GraphQLResolveInfo {
  mergeInfo?: MergeInfo;
}

export type Fetcher = (operation: IFetcherOperation) => Promise<ExecutionResult>;

export interface IFetcherOperation {
  query: DocumentNode;
  operationName?: string;
  variables?: { [key: string]: any };
  context?: { [key: string]: any };
}

export type Dispatcher = (context: any) => ApolloLink | Fetcher;

export type SubschemaConfig = {
  schema: GraphQLSchemaWithTransforms;
  rootValue?: Record<string, any>;
  executor?: Delegator;
  subscriber?: Delegator;
  link?: ApolloLink;
  fetcher?: Fetcher;
  dispatcher?: Dispatcher;
  transforms?: Array<Transform>;
  mergedTypeConfigs?: Record<string, MergedTypeConfig>;
};

export type MergedTypeConfig = {
  fragment?: string;
  mergedTypeResolver: MergedTypeResolver;
};

export type MergedTypeResolver = (
  subschema: GraphQLSchema | SubschemaConfig,
  originalResult: any,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
) => any;

export type GraphQLSchemaWithTransforms = GraphQLSchema & { transforms?: Array<Transform> };

export type SchemaLikeObject =
  SubschemaConfig |
  GraphQLSchema |
  string |
  DocumentNode |
  Array<GraphQLNamedType>;

export function isSubschemaConfig(value: SchemaLikeObject): value is SubschemaConfig {
  return !!(value as SubschemaConfig).schema;
}

export interface IDelegateToSchemaOptions<TContext = { [key: string]: any }> {
  schema: GraphQLSchema | SubschemaConfig;
  operation?: Operation;
  fieldName?: string;
  returnType?: GraphQLOutputType;
  args?: { [key: string]: any };
  context?: TContext;
  info: IGraphQLToolsResolveInfo;
  rootValue?: Record<string, any>;
  transforms?: Array<Transform>;
  skipValidation?: boolean;
  skipTypeMerging?: boolean;
}

export interface ICreateDelegatingRequestOptions {
  schema: GraphQLSchema | SubschemaConfig;
  info: IGraphQLToolsResolveInfo;
  operation: Operation;
  fieldName: string;
  args?: { [key: string]: any };
  transforms?: Array<Transform>;
  skipValidation?: boolean;
}

export interface IDelegateRequestOptions<TContext = { [key: string]: any }> {
  request: Request;
  schema: GraphQLSchema | SubschemaConfig;
  rootValue?: Record<string, any>;
  info: IGraphQLToolsResolveInfo;
  operation: Operation;
  fieldName: string;
  returnType?: GraphQLOutputType;
  context?: TContext;
  transforms?: Array<Transform>;
  skipTypeMerging?: boolean;
}

export type Delegator = ({ document, context, variables }: {
  document: DocumentNode;
  context?: { [key: string]: any };
  variables?: { [key: string]: any };
}) => any;

export type MergeInfo = {
  delegate: (
    type: 'query' | 'mutation' | 'subscription',
    fieldName: string,
    args: { [key: string]: any },
    context: { [key: string]: any },
    info: GraphQLResolveInfo,
    transforms?: Array<Transform>,
  ) => any;
  fragments: Array<{
    field: string;
    fragment: string;
  }>;
  replacementFragments: ReplacementFragmentMapping,
  mergedTypes: MergedTypeMapping,
  delegateToSchema<TContext>(options: IDelegateToSchemaOptions<TContext>): any;
};

export type ReplacementFragmentMapping = {
  [typeName: string]: { [fieldName: string]: InlineFragmentNode };
};

export type MergedTypeMapping = Record<string, {
  fragment: InlineFragmentNode,
  subschemas: Array<SubschemaConfig>,
}>;

export type IFieldResolver<TSource, TContext, TArgs = Record<string, any>> = (
  source: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo & { mergeInfo: MergeInfo },
) => any;

export type ITypedef = (() => ITypedef[]) | string | DocumentNode;
export type ITypeDefinitions = ITypedef | ITypedef[];
export type IResolverObject<TSource = any, TContext = any, TArgs = any> = {
  [key: string]:
    | IFieldResolver<TSource, TContext, TArgs>
    | IResolverOptions<TSource, TContext>
    | IResolverObject<TSource, TContext>;
};
export type IEnumResolver = { [key: string]: string | number };
export interface IResolvers<TSource = any, TContext = any> {
  [key: string]:
    | (() => any)
    | IResolverObject<TSource, TContext>
    | IResolverOptions<TSource, TContext>
    | GraphQLScalarType
    | IEnumResolver;
}
export type IResolversParameter =
  | Array<IResolvers | ((mergeInfo: MergeInfo) => IResolvers)>
  | IResolvers
  | ((mergeInfo: MergeInfo) => IResolvers);

export interface ILogger {
  log: (message: string | Error) => void;
}

export interface IConnectorCls<TContext = any> {
  new (context?: TContext): any;
}
export type IConnectorFn<TContext = any> = (context?: TContext) => any;
export type IConnector<TContext = any> =
  | IConnectorCls<TContext>
  | IConnectorFn<TContext>;

export type IConnectors<TContext = any> = {
  [key: string]: IConnector<TContext>;
};

export interface IExecutableSchemaDefinition<TContext = any> {
  typeDefs: ITypeDefinitions;
  resolvers?: IResolvers<any, TContext> | Array<IResolvers<any, TContext>>;
  connectors?: IConnectors<TContext>;
  logger?: ILogger;
  allowUndefinedInResolve?: boolean;
  resolverValidationOptions?: IResolverValidationOptions;
  directiveResolvers?: IDirectiveResolvers<any, TContext>;
  schemaDirectives?: { [name: string]: typeof SchemaDirectiveVisitor };
  parseOptions?: GraphQLParseOptions;
  inheritResolversFromInterfaces?: boolean;
}

export type IFieldIteratorFn = (
  fieldDef: GraphQLField<any, any>,
  typeName: string,
  fieldName: string,
) => void;

export type IDefaultValueIteratorFn = (
  type: GraphQLInputType,
  value: any,
) => void;

export type NextResolverFn = () => Promise<any>;
export type DirectiveResolverFn<TSource = any, TContext = any> = (
  next: NextResolverFn,
  source: TSource,
  args: { [argName: string]: any },
  context: TContext,
  info: GraphQLResolveInfo,
) => any;

export interface IDirectiveResolvers<TSource = any, TContext = any> {
  [directiveName: string]: DirectiveResolverFn<TSource, TContext>;
}

/* XXX on mocks, args are optional, Not sure if a bug. */
export type IMockFn = GraphQLFieldResolver<any, any>;
export type IMocks = { [key: string]: IMockFn };
export type IMockTypeFn = (
  type: GraphQLType,
  typeName?: string,
  fieldName?: string,
) => GraphQLFieldResolver<any, any>;

export interface IMockOptions {
  schema: GraphQLSchema;
  mocks?: IMocks;
  preserveResolvers?: boolean;
}

export interface IMockServer {
  query: (
    query: string,
    vars?: { [key: string]: any },
  ) => Promise<ExecutionResult>;
}

export type OnTypeConflict = (
  left: GraphQLNamedType,
  right: GraphQLNamedType,
  info?: {
    left: {
      schema?: GraphQLSchema | SubschemaConfig;
    };
    right: {
      schema?: GraphQLSchema | SubschemaConfig;
    };
  },
) => GraphQLNamedType;

export type Operation = 'query' | 'mutation' | 'subscription';

export type Request = {
  document: DocumentNode;
  variables: Record<string, any>;
  extensions?: Record<string, any>;
};

export type Result = ExecutionResult & {
  extensions?: Record<string, any>;
};

export type ResolveType<T extends GraphQLType> = (type: T) => T;

export type GraphQLParseOptions = {
  noLocation?: boolean;
  allowLegacySDLEmptyFields?: boolean;
  allowLegacySDLImplementsInterfaces?: boolean;
  experimentalFragmentVariables?: boolean;
};

export type IndexedObject<V> = { [key: string]: V } | ReadonlyArray<V>;

export type VisitableSchemaType =
    GraphQLSchema
  | GraphQLObjectType
  | GraphQLInterfaceType
  | GraphQLInputObjectType
  | GraphQLNamedType
  | GraphQLScalarType
  | GraphQLField<any, any>
  | GraphQLInputField
  | GraphQLArgument
  | GraphQLUnionType
  | GraphQLEnumType
  | GraphQLEnumValue;

export type VisitorSelector = (
  type: VisitableSchemaType,
  methodName: string,
) => Array<SchemaVisitor | SchemaVisitorMap>;

export enum VisitSchemaKind {
  TYPE = 'VisitSchemaKind.TYPE',
  SCALAR_TYPE = 'VisitSchemaKind.SCALAR_TYPE',
  ENUM_TYPE = 'VisitSchemaKind.ENUM_TYPE',
  COMPOSITE_TYPE = 'VisitSchemaKind.COMPOSITE_TYPE',
  OBJECT_TYPE = 'VisitSchemaKind.OBJECT_TYPE',
  INPUT_OBJECT_TYPE = 'VisitSchemaKind.INPUT_OBJECT_TYPE',
  ABSTRACT_TYPE = 'VisitSchemaKind.ABSTRACT_TYPE',
  UNION_TYPE = 'VisitSchemaKind.UNION_TYPE',
  INTERFACE_TYPE = 'VisitSchemaKind.INTERFACE_TYPE',
  ROOT_OBJECT = 'VisitSchemaKind.ROOT_OBJECT',
  QUERY = 'VisitSchemaKind.QUERY',
  MUTATION = 'VisitSchemaKind.MUTATION',
  SUBSCRIPTION = 'VisitSchemaKind.SUBSCRIPTION',
}

export type SchemaVisitorMap = { [key in VisitSchemaKind]?: TypeVisitor };
export type TypeVisitor = (
  type: GraphQLType,
  schema: GraphQLSchema,
) => GraphQLNamedType | null | undefined;
