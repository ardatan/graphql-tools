import {
  ITypeDefinitions,
  IResolvers,
  IResolverValidationOptions,
  IDirectiveResolvers,
  SchemaDirectiveVisitorClass,
  GraphQLParseOptions,
  SchemaTransform,
} from '@graphql-tools/utils';

export interface ILogger {
  log: (error: Error) => void;
}

export interface IExecutableSchemaDefinition<TContext = any> {
  typeDefs: ITypeDefinitions;
  resolvers?: IResolvers<any, TContext> | Array<IResolvers<any, TContext>>;
  logger?: ILogger;
  allowUndefinedInResolve?: boolean;
  resolverValidationOptions?: IResolverValidationOptions;
  directiveResolvers?: IDirectiveResolvers<any, TContext>;
  schemaDirectives?: Record<string, SchemaDirectiveVisitorClass>;
  schemaTransforms?: Array<SchemaTransform>;
  parseOptions?: GraphQLParseOptions;
  inheritResolversFromInterfaces?: boolean;
}
