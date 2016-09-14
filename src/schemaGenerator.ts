// Generates a schema for graphql-js given a shorthand schema

// TODO: document each function clearly in the code: what arguments it accepts
// and what it outputs.

import { Document, parse, Kind, Definition } from 'graphql';
import { uniq } from 'lodash';
import { buildASTSchema, extendSchema } from 'graphql';
import {
  GraphQLScalarType,
  getNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLResolveInfo,
  GraphQLFieldDefinition,
  GraphQLFieldResolveFn,
  GraphQLType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLFieldDefinitionMap
} from 'graphql';
import {
  IExecutableSchemaDefinition ,
  ILogger,
  IResolvers,
  ITypeDefinitions,
  ITypedef,
  IFieldIteratorFn,
  IConnectors,
  IConnector,
  IConnectorCls,
  IConnectorFn,
  IResolverValidationOptions,
} from './Interfaces';
import { deprecated } from "deprecated-decorator";

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
class SchemaError extends Error {
    constructor(public message: string) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
    }
}

// type definitions can be a string or an array of strings.
function _generateSchema(
  typeDefinitions: ITypeDefinitions,
  resolveFunctions: IResolvers,
  logger: ILogger,
  // TODO: rename to allowUndefinedInResolve to be consistent
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
) {
  if (typeof resolverValidationOptions !== 'object') {
    throw new SchemaError('Expected `resolverValidationOptions` to be an object');
  }
  if (!typeDefinitions) {
    throw new SchemaError('Must provide typeDefs');
  }
  if (!resolveFunctions) {
    throw new SchemaError('Must provide resolvers');
  }

  // TODO: check that typeDefinitions is either string or array of strings

  const schema = buildSchemaFromTypeDefinitions(typeDefinitions);

  addResolveFunctionsToSchema(schema, resolveFunctions);

  assertResolveFunctionsPresent(schema, resolverValidationOptions);

  if (!allowUndefinedInResolve) {
    addCatchUndefinedToSchema(schema);
  }

  if (logger) {
    addErrorLoggingToSchema(schema, logger);
  }

  return schema;
}

function makeExecutableSchema({
  typeDefs,
  resolvers,
  connectors,
  logger,
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
}: IExecutableSchemaDefinition) {
  const jsSchema = _generateSchema(
    typeDefs, resolvers, logger, allowUndefinedInResolve, resolverValidationOptions
  );
  if (typeof resolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    addSchemaLevelResolveFunction(jsSchema, resolvers['__schema'] as GraphQLFieldResolveFn);
  }
  if (connectors) {
    // connectors are optional, at least for now. That means you can just import them in the resolve
    // function if you want.
    attachConnectorsToContext(jsSchema, connectors);
  }
  return jsSchema;
}

function concatenateTypeDefs(typeDefinitionsAry: ITypedef[], functionsCalled = {}): string {
  let resolvedTypeDefinitions: string[] = [];
  typeDefinitionsAry.forEach((typeDef: ITypedef) => {
    if (typeof typeDef === 'function') {
      if (!(typeDef as any in functionsCalled)) {
        functionsCalled[typeDef as any] = 1;
        resolvedTypeDefinitions = resolvedTypeDefinitions.concat(
          concatenateTypeDefs(typeDef(), functionsCalled)
        );
      }
    } else if (typeof typeDef === 'string') {
      resolvedTypeDefinitions.push(typeDef.trim());
    } else {
      const type = typeof typeDef;
      throw new SchemaError(`typeDef array must contain only strings and functions, got ${type}`);
    }
  });
  return uniq(resolvedTypeDefinitions.map((x) => x.trim())).join('\n');
}

function buildSchemaFromTypeDefinitions(typeDefinitions: ITypeDefinitions): GraphQLSchema {
  // TODO: accept only array here, otherwise interfaces get confusing.
  let myDefinitions = typeDefinitions;
  if (typeof myDefinitions !== 'string') {
    if (!Array.isArray(myDefinitions)) {
      // TODO improve error message and say what type was actually found
      throw new SchemaError('`typeDefs` must be a string or array');
    }
    myDefinitions = concatenateTypeDefs(myDefinitions);
  }

  const astDocument: Document = parse(myDefinitions);
  let schema: GraphQLSchema = buildASTSchema(astDocument);

  const extensionsAst = extractExtensionDefinitions(astDocument);
  if (extensionsAst.definitions.length > 0) {
    schema = extendSchema(schema, extensionsAst);
  }

  return schema;
}

function extractExtensionDefinitions(ast: Document) {
  const extensionDefs =
    ast.definitions.filter((def: Definition) => def.kind === Kind.TYPE_EXTENSION_DEFINITION);

  return Object.assign({}, ast, {
    definitions: extensionDefs,
  });
}

function forEachField(schema: GraphQLSchema, fn: IFieldIteratorFn): void {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach((typeName) => {
    const type = typeMap[typeName];

    // TODO: maybe have an option to include these?
    if (!getNamedType(type).name.startsWith('__') && type instanceof GraphQLObjectType) {
      const fields = type.getFields();
      Object.keys(fields).forEach((fieldName) => {
        const field = fields[fieldName];
        fn(field, typeName, fieldName);
      });
    }
  });
}

// takes a GraphQL-JS schema and an object of connectors, then attaches
// the connectors to the context by wrapping each query or mutation resolve
// function with a function that attaches connectors if they don't exist.
// attaches connectors only once to make sure they are singletons
const attachConnectorsToContext = deprecated<Function>({
    version: '0.7.0',
    url: 'https://github.com/apollostack/graphql-tools/issues/140',
}, function attachConnectorsToContext(schema: GraphQLSchema, connectors: IConnectors): void {
  if (!schema || !(schema instanceof GraphQLSchema)) {
    throw new Error(
      'schema must be an instance of GraphQLSchema. ' +
      'This error could be caused by installing more than one version of GraphQL-JS'
    );
  }

  if (typeof connectors !== 'object') {
    const connectorType = typeof connectors;
    throw new Error(
      `Expected connectors to be of type object, got ${connectorType}`
    );
  }
  if (Object.keys(connectors).length === 0) {
    throw new Error(
      'Expected connectors to not be an empty object'
    );
  }
  if (Array.isArray(connectors)) {
    throw new Error(
      'Expected connectors to be of type object, got Array'
    );
  }
  if (schema['_apolloConnectorsAttached']) {
    throw new Error('Connectors already attached to context, cannot attach more than once');
  }
  schema['_apolloConnectorsAttached'] = true;
  const attachconnectorFn: GraphQLFieldResolveFn = (root: any, args: { [key: string]: any }, ctx: any) => {
    if (typeof ctx !== 'object') {
      // if in any way possible, we should throw an error when the attachconnectors
      // function is called, not when a query is executed.
      const contextType = typeof ctx;
      throw new Error(`Cannot attach connector because context is not an object: ${contextType}`);
    }
    if (typeof ctx.connectors === 'undefined') {
      ctx.connectors = {};
    }
    Object.keys(connectors).forEach((connectorName) => {
      let connector: IConnector = connectors[connectorName];
      if ( !!connector.prototype ) {
          ctx.connectors[connectorName] = new (<IConnectorCls> connector)(ctx);
      /** XXX Babel will eliminate this flow.
      } else if ( typeof connector === 'function' ) {
          ctx.connectors[connectorName] = (<IConnectorFn> connector)(ctx);
      */
      } else {
          throw new Error(`Connector must be a function or an class`);
      }
    });
    return root;
  };
  addSchemaLevelResolveFunction(schema, attachconnectorFn);
});

// wraps all resolve functions of query, mutation or subscription fields
// with the provided function to simulate a root schema level resolve funciton
function addSchemaLevelResolveFunction(schema: GraphQLSchema, fn: GraphQLFieldResolveFn): void {
  // TODO test that schema is a schema, fn is a function
  const rootTypes = ([
    schema.getQueryType(),
    schema.getMutationType(),
    schema.getSubscriptionType(),
  ]).filter(x => !!x);
  // XXX this should run at most once per request to simulate a true root resolver
  // for graphql-js this is an approximation that works with queries but not mutations
  const rootResolveFn = runAtMostOncePerRequest(fn);
  rootTypes.forEach((type) => {
    const fields = type.getFields();
    Object.keys(fields).forEach((fieldName) => {
      fields[fieldName].resolve = wrapResolver(fields[fieldName].resolve, rootResolveFn);
    });
  });
}

function getFieldsForType(type: GraphQLType): GraphQLFieldDefinitionMap {
    if ((type instanceof GraphQLObjectType) ||
        (type instanceof GraphQLInterfaceType)) {
        return type.getFields();
    } else {
        return undefined;
    }
}

function addResolveFunctionsToSchema(schema: GraphQLSchema, resolveFunctions: IResolvers) {
  Object.keys(resolveFunctions).forEach((typeName) => {
    const type = schema.getType(typeName);
    if (!type && typeName !== '__schema') {
      throw new SchemaError(
        `"${typeName}" defined in resolvers, but not in schema`
      );
    }

    Object.keys(resolveFunctions[typeName]).forEach((fieldName) => {
      if (fieldName.startsWith('__')) {
        // this is for isTypeOf and resolveType and all the other stuff.
        // TODO require resolveType for unions and interfaces.
        type[fieldName.substring(2)] = resolveFunctions[typeName][fieldName];
        return;
      }

      const fields = getFieldsForType(type);
      if (!fields) {
          throw new SchemaError(
              `${typeName} was defined in resolvers, but it's not an object`,
          );
      }

      if (!fields[fieldName]) {
        throw new SchemaError(
          `${typeName}.${fieldName} defined in resolvers, but not in schema`
        );
      }
      const field = fields[fieldName];
      const fieldResolve = resolveFunctions[typeName][fieldName];
      if (typeof fieldResolve === 'function') {
        // for convenience. Allows shorter syntax in resolver definition file
        setFieldProperties(field, { resolve: fieldResolve });
      } else {
        if (typeof fieldResolve !== 'object') {
          throw new SchemaError(`Resolver ${typeName}.${fieldName} must be object or function`);
        }
        setFieldProperties(field, fieldResolve);
      }
    });
  });
}

function setFieldProperties(field: GraphQLFieldDefinition, propertiesObj: Object) {
  Object.keys(propertiesObj).forEach((propertyName) => {
    field[propertyName] = propertiesObj[propertyName];
  });
}

function assertResolveFunctionsPresent(schema: GraphQLSchema, resolverValidationOptions: IResolverValidationOptions = {}) {
  const {
    requireResolversForArgs = true,
    requireResolversForNonScalar = true,
    requireResolversForAllFields = false,
  } = resolverValidationOptions;

  if (requireResolversForAllFields && (!requireResolversForArgs || !requireResolversForNonScalar)) {
    throw new TypeError(
      'requireResolversForAllFields takes precedence over the more specific assertions. ' +
      'Please configure either requireResolversForAllFields or requireResolversForArgs / ' +
      'requireResolversForNonScalar, but not a combination of them.'
    );
  }

  forEachField(schema, (field, typeName, fieldName) => {
    // requires a resolve function for *every* field.
    if (requireResolversForAllFields) {
      expectResolveFunction(field, typeName, fieldName);
    }

    // requires a resolve function on every field that has arguments
    if (requireResolversForArgs && field.args.length > 0) {
      expectResolveFunction(field, typeName, fieldName);
    }

    // requires a resolve function on every field that returns a non-scalar type
    if (requireResolversForNonScalar && !(getNamedType(field.type) instanceof GraphQLScalarType)) {
      expectResolveFunction(field, typeName, fieldName);
    }
  });
}

function expectResolveFunction(field: GraphQLFieldDefinition, typeName: string, fieldName: string) {
  if (!field.resolve) {
    // tslint:disable-next-line: max-line-length
    console.warn(`Resolve function missing for "${typeName}.${fieldName}". To disable this warning check https://github.com/apollostack/graphql-tools/issues/131`);
    return;
  }
  if (typeof field.resolve !== 'function') {
    throw new SchemaError(`Resolver "${typeName}.${fieldName}" must be a function`);
  }
}

function addErrorLoggingToSchema(schema: GraphQLSchema, logger: ILogger): void {
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

function wrapResolver(innerResolver: GraphQLFieldResolveFn | undefined, outerResolver: GraphQLFieldResolveFn): GraphQLFieldResolveFn {
  return (obj, args, ctx, info) => {
    const root = outerResolver(obj, args, ctx, info);
    if (innerResolver) {
      return innerResolver(root, args, ctx, info);
    }
    return defaultResolveFn(root, args, ctx, info);
  };
}
/*
 * fn: The function to decorate with the logger
 * logger: an object instance of type Logger
 * hint: an optional hint to add to the error's message
 */
function decorateWithLogger(fn: GraphQLFieldResolveFn | undefined, logger: ILogger, hint: string = ''): GraphQLFieldResolveFn {
  if (typeof fn === 'undefined') {
    fn = defaultResolveFn;
  }

  return (root, args, ctx, info) => {
    try {
      return fn(root, args, ctx, info);
    } catch (e) {
      // TODO: clone the error properly
      const newE = new Error();
      newE.stack = e.stack;
      /* istanbul ignore else: always get the hint from addErrorLoggingToSchema */
      if (hint) {
        newE['originalMessage'] = e.message;
        newE['message'] = `Error in resolver ${hint}\n${e.message}`;
      }
      logger.log(newE);
      // we want to pass on the error, just in case.
      throw e;
    }
  };
}

function addCatchUndefinedToSchema(schema: GraphQLSchema): void {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}

function decorateToCatchUndefined(fn: GraphQLFieldResolveFn, hint: string): GraphQLFieldResolveFn {
  if (typeof fn === 'undefined') {
    fn = defaultResolveFn;
  }
  return (root, args, ctx, info) => {
    const result = fn(root, args, ctx, info);
    if (typeof result === 'undefined') {
      throw new Error(`Resolve function for "${hint}" returned undefined`);
    }
    return result;
  };
}

// XXX this function only works for resolvers
// XXX very hacky way to remember if the function
// already ran for this request. This will only work
// if people don't actually cache the operation.
// if they do cache the operation, they will have to
// manually remove the __runAtMostOnce before every request.
function runAtMostOncePerRequest(fn: GraphQLFieldResolveFn): GraphQLFieldResolveFn {
  let value: any;
  const randomNumber = Math.random();
  return (root, args, ctx, info) => {
    if (!info.operation['__runAtMostOnce']) {
      info.operation['__runAtMostOnce'] = {};
    }
    if (!info.operation['__runAtMostOnce'][randomNumber]) {
      info.operation['__runAtMostOnce'][randomNumber] = true;
      value = fn(root, args, ctx, info);
    }
    return value;
  };
}

/**
 * XXX taken from graphql-js: src/execution/execute.js, because that function
 * is not exported
 *
 * If a resolve function is not given, then a default resolve behavior is used
 * which takes the property of the source object of the same name as the field
 * and returns it as the result, or if it's a function, returns the result
 * of calling that function.
 */
function defaultResolveFn(source: any, args: { [key: string]: string }, context: any, { fieldName }: GraphQLResolveInfo) {
  // ensure source is a value for which property access is acceptable.
  if (typeof source === 'object' || typeof source === 'function') {
    const property = source[fieldName];
    return typeof property === 'function' ? source[fieldName]() : property;
  }
  return undefined;
}

export {
  makeExecutableSchema,
  SchemaError,
  forEachField,
  addErrorLoggingToSchema,
  addResolveFunctionsToSchema,
  addCatchUndefinedToSchema,
  assertResolveFunctionsPresent,
  buildSchemaFromTypeDefinitions,
  addSchemaLevelResolveFunction,
  attachConnectorsToContext,
};
