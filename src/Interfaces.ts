import {
  GraphQLSchema,
  GraphQLField,
  ExecutionResult,
  GraphQLType,
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  GraphQLIsTypeOfFn,
  GraphQLTypeResolver,
  GraphQLScalarType,
  GraphQLNamedType,
  DocumentNode,
} from 'graphql';

import { SchemaDirectiveVisitor } from './schemaVisitor';

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
  resolverValidationOptions?: IResolverValidationOptions;
  inheritResolversFromInterfaces?: boolean;
}

export interface IResolverOptions<TSource = any, TContext = any> {
  fragment?: string;
  resolve?: IFieldResolver<TSource, TContext>;
  subscribe?: IFieldResolver<TSource, TContext>;
  __resolveType?: GraphQLTypeResolver<TSource, TContext>;
  __isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext>;
}

export type Transform = {
  transformSchema?: (schema: GraphQLSchema) => GraphQLSchema;
  transformRequest?: (originalRequest: Request) => Request;
  transformResult?: (result: Result) => Result;
};

export interface IDelegateToSchemaOptions<TContext = { [key: string]: any }> {
  schema: GraphQLSchema;
  operation: Operation;
  fieldName: string;
  args?: { [key: string]: any };
  context: TContext;
  info: GraphQLResolveInfo;
  transforms?: Array<Transform>;
}

export interface ICreateRequestOptions {
  schema: GraphQLSchema;
  operation: 'query' | 'mutation' | 'subscription';
  roots: Array<OperationRootDefinition>;
  info: GraphQLResolveInfo;
  transforms?: Array<Transform>;
}

export type MergeInfo = {
  delegate: (
    type: 'query' | 'mutation' | 'subscription',
    fieldName: string,
    args: { [key: string]: any },
    context: { [key: string]: any },
    info: GraphQLResolveInfo,
    transforms?: Array<Transform>,
  ) => any;
  delegateToSchema<TContext>(options: IDelegateToSchemaOptions<TContext>): any;
};

export type IFieldResolver<TSource, TContext> = (
  source: TSource,
  args: { [argument: string]: any },
  context: TContext,
  info: GraphQLResolveInfo & { mergeInfo: MergeInfo },
) => any;

export type ITypedef = (() => ITypedef[]) | string | DocumentNode;
export type ITypeDefinitions = ITypedef | ITypedef[];
export type IResolverObject<TSource = any, TContext = any> = {
  [key: string]: IFieldResolver<TSource, TContext> | IResolverOptions;
};
export type IEnumResolver = { [key: string]: string | number };
export interface IResolvers<TSource = any, TContext = any> {
  [key: string]:
    | (() => any)
    | IResolverObject<TSource, TContext>
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

export type MergeTypeCandidate = {
  schema?: GraphQLSchema;
  type: GraphQLNamedType;
};

export type TypeWithResolvers = {
  type: GraphQLNamedType;
  resolvers?: IResolvers;
};

export type VisitTypeResult = GraphQLNamedType | TypeWithResolvers | null;

export type VisitType = (
  name: string,
  candidates: Array<MergeTypeCandidate>,
) => VisitTypeResult;

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

export type OperationRootDefinition = {
  fieldName: string,
  alias?: string,
  args?: { [key: string]: any },
  info?: GraphQLResolveInfo
};
