import {
  GraphQLSchema,
  GraphQLField,
  ExecutionResult,
  GraphQLType,
  GraphQLNamedType,
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  GraphQLIsTypeOfFn,
  GraphQLTypeResolver,
  GraphQLScalarType,
  DocumentNode,
} from 'graphql';

import { SchemaDirectiveVisitor } from './schemaVisitor';

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

export interface IAddResolveFunctionsToSchemaOptions {
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

export type SchemaExecutionConfig = {
  schema: GraphQLSchemaWithTransforms;
};

export type GraphQLSchemaWithTransforms = GraphQLSchema & { transforms?: Array<Transform> };

export type RemoteSchemaExecutionConfig = {
  schema: GraphQLSchemaWithTransforms;
  link?: ApolloLink;
  fetcher?: Fetcher;
  dispatcher?: Dispatcher;
};

export function isSchemaExecutionConfig(
  schema: string | GraphQLSchema | SchemaExecutionConfig | DocumentNode | Array<GraphQLNamedType>
): schema is SchemaExecutionConfig {
  return !!(schema as SchemaExecutionConfig).schema;
}

export function isRemoteSchemaExecutionConfig(
  schema: GraphQLSchema | SchemaExecutionConfig
): schema is RemoteSchemaExecutionConfig {
  return (
    !!(schema as RemoteSchemaExecutionConfig).dispatcher ||
    !!(schema as RemoteSchemaExecutionConfig).link ||
    !!(schema as RemoteSchemaExecutionConfig).fetcher
  );
}

export interface IDelegateToSchemaOptions<TContext = { [key: string]: any }> {
  schema: GraphQLSchema;
  operation: Operation;
  fieldName: string;
  args?: { [key: string]: any };
  context: TContext;
  info: IGraphQLToolsResolveInfo;
  transforms?: Array<Transform>;
  skipValidation?: boolean;
  executor?: Delegator;
  subscriber?: Delegator;
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
  delegateToSchema<TContext>(options: IDelegateToSchemaOptions<TContext>): any;
};

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
      schema?: GraphQLSchema;
    };
    right: {
      schema?: GraphQLSchema;
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
