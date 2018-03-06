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

/* TODO: Add documentation */

export type UnitOrList<Type> = Type | Array<Type>;
export interface IResolverValidationOptions {
  requireResolversForArgs?: boolean;
  requireResolversForNonScalar?: boolean;
  requireResolversForAllFields?: boolean;
  allowResolversNotInSchema?: boolean;
}

export interface IResolverOptions {
  resolve?: IFieldResolver<any, any>;
  subscribe?: IFieldResolver<any, any>;
  __resolveType?: GraphQLTypeResolver<any, any>;
  __isTypeOf?: GraphQLIsTypeOfFn<any, any>;
}

export type Transform = {
  transformSchema?: (schema: GraphQLSchema) => GraphQLSchema;
  transformRequest?: (originalRequest: Request) => Request;
  transformResult?: (result: Result) => Result;
};

export type MergeInfo = {
  delegate: (
    schemaName: string,
    type: 'query' | 'mutation' | 'subscription',
    fieldName: string,
    args: { [key: string]: any },
    context: { [key: string]: any },
    info: GraphQLResolveInfo,
  ) => any;
  getSubSchema: (schemaName: string) => GraphQLSchema;
  delegateToSchema: (
    schema: GraphQLSchema,
    type: 'query' | 'mutation' | 'subscription',
    fieldName: string,
    args: { [key: string]: any },
    context: { [key: string]: any },
    info: GraphQLResolveInfo,
    transforms?: Array<Transform>,
  ) => any;
};

export type IFieldResolver<TSource, TContext> = (
  source: TSource,
  args: { [argument: string]: any },
  context: TContext,
  info: GraphQLResolveInfo & { mergeInfo: MergeInfo },
) => any;

export type ITypedef = (() => ITypedef[]) | string | DocumentNode;
export type ITypeDefinitions = ITypedef | ITypedef[];
export type IResolverObject = {
  [key: string]: IFieldResolver<any, any> | IResolverOptions;
};
export type IEnumResolver = { [key: string]: string | number };
export interface IResolvers {
  [key: string]:
    | (() => any)
    | IResolverObject
    | GraphQLScalarType
    | IEnumResolver;
}
export interface ILogger {
  log: (message: string | Error) => void;
}

export interface IConnectorCls {
  new (context?: any): any;
}
export type IConnectorFn = (context?: any) => any;
export type IConnector = IConnectorCls | IConnectorFn;

export type IConnectors = { [key: string]: IConnector };

export interface IExecutableSchemaDefinition {
  typeDefs: ITypeDefinitions;
  resolvers?: IResolvers | Array<IResolvers>;
  connectors?: IConnectors;
  logger?: ILogger;
  allowUndefinedInResolve?: boolean;
  resolverValidationOptions?: IResolverValidationOptions;
  directiveResolvers?: IDirectiveResolvers<any, any>;
  parseOptions?: GraphQLParseOptions;
}

export type IFieldIteratorFn = (
  fieldDef: GraphQLField<any, any>,
  typeName: string,
  fieldName: string,
) => void;

export type NextResolverFn = () => Promise<any>;
export type DirectiveResolverFn<TSource, TContext> = (
  next: NextResolverFn,
  source: TSource,
  args: { [argName: string]: any },
  context: TContext,
  info: GraphQLResolveInfo,
) => any;

export interface IDirectiveResolvers<TSource, TContext> {
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
  schemaName: string;
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
