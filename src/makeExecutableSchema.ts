import {
  defaultFieldResolver,
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLScalarType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLUnionType,
  printSchema,
  GraphQLNamedType
} from 'graphql';

import {
  IExecutableSchemaDefinition,
  ILogger,
  IResolvers,
  ITypeDefinitions,
  IResolverValidationOptions,
  UnitOrList,
  GraphQLParseOptions,
} from './Interfaces';

import { SchemaDirectiveVisitor } from './schemaVisitor';
import mergeDeep from './mergeDeep';

import {
  attachDirectiveResolvers,
  assertResolveFunctionsPresent,
  addResolveFunctionsToSchema,
  attachConnectorsToContext,
  addSchemaLevelResolveFunction,
  buildSchemaFromTypeDefinitions,
  decorateWithLogger,
  forEachField,
  SchemaError,
} from './generate';

import { recreateType, createResolveType } from './stitching/schemaRecreation'
import resolveFromParentTypename from './stitching/resolveFromParentTypename';

// type definitions can be a string or an array of strings.
function _generateSchema(
  typeDefinitions: ITypeDefinitions,
  resolveFunctions: UnitOrList<IResolvers>,
  logger: ILogger,
  // TODO: rename to allowUndefinedInResolve to be consistent
  allowUndefinedInResolve: boolean,
  resolverValidationOptions: IResolverValidationOptions,
  parseOptions: GraphQLParseOptions,
  inheritResolversFromInterfaces: boolean,
) {
  if (typeof resolverValidationOptions !== 'object') {
    throw new SchemaError(
      'Expected `resolverValidationOptions` to be an object',
    );
  }
  if (!typeDefinitions) {
    throw new SchemaError('Must provide typeDefs');
  }
  if (!resolveFunctions) {
    throw new SchemaError('Must provide resolvers');
  }

  const resolvers = Array.isArray(resolveFunctions)
    ? resolveFunctions
        .filter(resolverObj => typeof resolverObj === 'object')
        .reduce(mergeDeep, {})
    : resolveFunctions;

  // TODO: check that typeDefinitions is either string or array of strings

  const schema = buildSchemaFromTypeDefinitions(typeDefinitions, parseOptions);

  addResolveFunctionsToSchema({
    schema,
    resolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces,
  });

  assertResolveFunctionsPresent(schema, resolverValidationOptions);

  if (!allowUndefinedInResolve) {
    addCatchUndefinedToSchema(schema);
  }

  if (logger) {
    addErrorLoggingToSchema(schema, logger);
  }

  return schema;
}

export function makeExecutableSchema<TContext = any>({
  typeDefs,
  resolvers = {},
  connectors,
  logger,
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
  directiveResolvers = null,
  schemaDirectives = null,
  parseOptions = {},
  inheritResolversFromInterfaces = false,
}: IExecutableSchemaDefinition<TContext>) {
  const jsSchema = _generateSchema(
    typeDefs,
    resolvers,
    logger,
    allowUndefinedInResolve,
    resolverValidationOptions,
    parseOptions,
    inheritResolversFromInterfaces,
  );
  if (typeof resolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    addSchemaLevelResolveFunction(jsSchema, resolvers[
      '__schema'
    ] as GraphQLFieldResolver<any, any>);
  }
  if (connectors) {
    // connectors are optional, at least for now. That means you can just import them in the resolve
    // function if you want.
    attachConnectorsToContext(jsSchema, connectors);
  }

  if (directiveResolvers) {
    attachDirectiveResolvers(jsSchema, directiveResolvers);
  }

  if (schemaDirectives) {
    SchemaDirectiveVisitor.visitSchemaDirectives(jsSchema, schemaDirectives);
  }

  return jsSchema;
}

function decorateToCatchUndefined(
  fn: GraphQLFieldResolver<any, any>,
  hint: string,
): GraphQLFieldResolver<any, any> {
  if (typeof fn === 'undefined') {
    fn = defaultFieldResolver;
  }
  return (root, args, ctx, info) => {
    const result = fn(root, args, ctx, info);
    if (typeof result === 'undefined') {
      throw new Error(`Resolve function for "${hint}" returned undefined`);
    }
    return result;
  };
}

const reduceObject = (fn: Function) => (o: object) =>
  Object.keys(o).reduce((accum, key) => {
    const v = fn(o[key], key, o);
    if (v) {
      return {
        ...accum,
        [key]: v,
      };
    }
    return accum;
  }, {});

export function cloneSchema(schema: GraphQLSchema): GraphQLSchema {
  const resolvers = reduceObject(
    (
      type: GraphQLNamedType,
      key: string,
      types: { [key: string]: GraphQLNamedType },
    ) => {
      const resolveType = createResolveType((name: string, type) => type);
      if (!key.startsWith('__')) {
        if (type instanceof GraphQLObjectType) {
          return reduceObject(
            (field: GraphQLField<any, any>) =>
              typeof field.resolve === 'function'
                ? field.resolve.bind(null)
                : field.resolve,
          )(type.getFields());
        }

        if (type instanceof GraphQLUnionType || type instanceof GraphQLInterfaceType) {
          return {
            __resolveType:
              type.resolveType
                ? type.resolveType.bind(null)
                : ((parent: any, context: any, info: GraphQLResolveInfo) =>
                    resolveFromParentTypename(parent, info.schema)),
          };
        }

        if (type instanceof GraphQLScalarType) {
          return recreateType(type, resolveType, false);
        }
      }
    },
  )(schema.getTypeMap());

  return makeExecutableSchema({
    typeDefs: printSchema(schema),
    resolvers,
  });
}

export function addCatchUndefinedToSchema(schema: GraphQLSchema): void {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}

export function addErrorLoggingToSchema(
  schema: GraphQLSchema,
  logger: ILogger,
): void {
  if (!logger) {
    throw new Error('Must provide a logger');
  }
  if (typeof logger.log !== 'function') {
    throw new Error('Logger.log must be a function');
  }
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
  });
}

export * from './generate';
