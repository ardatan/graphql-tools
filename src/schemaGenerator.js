// Generates a schema for graphql-js given a shorthand schema

// TODO: document each function clearly in the code: what arguments it accepts
// and what it outputs.

import { parse, Kind } from 'graphql/language';
import uniq from 'lodash.uniq';
import { buildASTSchema, extendSchema } from 'graphql/utilities';
import {
  GraphQLScalarType,
  getNamedType,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql/type';

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
function SchemaError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
// eslint-disable-next-line new-parens
SchemaError.prototype = new Error;

function generateSchema(...args) {
  console.error('generateSchema is deprecated, use makeExecutableSchema instead');
  return _generateSchema(...args);
}

// type definitions can be a string or an array of strings.
function _generateSchema(
  typeDefinitions,
  resolveFunctions,
  logger,
  // TODO: rename to allowUndefinedInResolve to be consistent
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
) {
  if (typeof resolverValidationOptions !== 'object') {
    throw new SchemaError('Expected `resolverValidationOptions` to be an object');
  }
  if (!typeDefinitions) {
    throw new SchemaError('Must provide typeDefinitions');
  }
  if (!resolveFunctions) {
    throw new SchemaError('Must provide resolveFunctions');
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
  allowUndefinedInResolve = false,
  resolverValidationOptions = {},
}) {
  const jsSchema = _generateSchema(
    typeDefs, resolvers, logger, allowUndefinedInResolve, resolverValidationOptions
  );
  if (typeof resolvers.__schema === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    addSchemaLevelResolveFunction(jsSchema, resolvers.__schema);
  }
  if (connectors) {
    // connectors are optional, at least for now. That means you can just import them in the resolve
    // function if you want.
    attachConnectorsToContext(jsSchema, connectors);
  }
  return jsSchema;
}

function concatenateTypeDefs(typeDefinitionsAry, functionsCalled = {}) {
  let resolvedTypeDefinitions = [];
  typeDefinitionsAry.forEach((typeDef) => {
    if (typeof typeDef === 'function') {
      if (!(typeDef in functionsCalled)) {
        // eslint-disable-next-line no-param-reassign
        functionsCalled[typeDef] = 1;
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

function buildSchemaFromTypeDefinitions(typeDefinitions) {
  // TODO: accept only array here, otherwise interfaces get confusing.
  let myDefinitions = typeDefinitions;
  if (typeof myDefinitions !== 'string') {
    if (!Array.isArray(myDefinitions)) {
      // TODO improve error message and say what type was actually found
      throw new SchemaError('`typeDefinitions` must be a string or array');
    }
    myDefinitions = concatenateTypeDefs(myDefinitions);
  }

  const astDocument = parse(myDefinitions);
  let schema = buildASTSchema(astDocument);

  const extensionsAst = extractExtensionDefinitions(astDocument);
  if (extensionsAst.definitions.length > 0) {
    schema = extendSchema(schema, extensionsAst);
  }

  return schema;
}

function extractExtensionDefinitions(ast) {
  const extensionDefs =
    ast.definitions.filter((def) => def.kind === Kind.TYPE_EXTENSION_DEFINITION);

  return {
    ...ast,
    definitions: extensionDefs,
  };
}

function forEachField(schema, fn) {
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
function attachConnectorsToContext(schema, connectors) {
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
  if (schema._apolloConnectorsAttached) {
    throw new Error('Connectors already attached to context, cannot attach more than once');
  }
  // eslint-disable-next-line no-param-reassign
  schema._apolloConnectorsAttached = true;
  const attachconnectorFn = (root, args, ctx) => {
    if (typeof ctx !== 'object') {
      // if in any way possible, we should throw an error when the attachconnectors
      // function is called, not when a query is executed.
      const contextType = typeof ctx;
      throw new Error(`Cannot attach connector because context is not an object: ${contextType}`);
    }
    if (typeof ctx.connectors === 'undefined') {
      // eslint-disable-next-line no-param-reassign
      ctx.connectors = {};
    }
    Object.keys(connectors).forEach((connectorName) => {
      // eslint-disable-next-line no-param-reassign
      ctx.connectors[connectorName] = new connectors[connectorName](ctx);
    });
    return root;
  };
  addSchemaLevelResolveFunction(schema, attachconnectorFn);
}

// wraps all resolve functions of query, mutation or subscription fields
// with the provided function to simulate a root schema level resolve funciton
function addSchemaLevelResolveFunction(schema, fn) {
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

function addResolveFunctionsToSchema(schema, resolveFunctions) {
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

      if (!type.getFields()[fieldName]) {
        throw new SchemaError(
          `${typeName}.${fieldName} defined in resolvers, but not in schema`
        );
      }
      const field = type.getFields()[fieldName];
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

function setFieldProperties(field, propertiesObj) {
  Object.keys(propertiesObj).forEach((propertyName) => {
    // eslint-disable-next-line no-param-reassign
    field[propertyName] = propertiesObj[propertyName];
  });
}

function assertResolveFunctionsPresent(schema, resolverValidationOptions = {}) {
  const {
    requireResolversForArgs = true,
    requireResolversForNonScalar = true,
  } = resolverValidationOptions;

  forEachField(schema, (field, typeName, fieldName) => {
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

function expectResolveFunction(field, typeName, fieldName) {
  if (!field.resolve) {
    throw new SchemaError(`Resolve function missing for "${typeName}.${fieldName}"`);
  }
  if (typeof field.resolve !== 'function') {
    throw new SchemaError(`Resolver "${typeName}.${fieldName}" must be a function`);
  }
}

function addErrorLoggingToSchema(schema, logger) {
  if (!logger) {
    throw new Error('Must provide a logger');
  }
  if (typeof logger.log !== 'function') {
    throw new Error('Logger.log must be a function');
  }
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
  });
}

function wrapResolver(innerResolver, outerResolver) {
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
function decorateWithLogger(fn, logger, hint = '') {
  if (typeof fn === 'undefined') {
    // eslint-disable-next-line no-param-reassign
    fn = defaultResolveFn;
  }
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      // TODO: clone the error properly
      const newE = new Error();
      newE.stack = e.stack;
      if (hint) {
        newE.originalMessage = e.message;
        newE.message = `Error in resolver ${hint}\n${e.message}`;
      }
      logger.log(newE);
      // we want to pass on the error, just in case.
      throw e;
    }
  };
}

function addCatchUndefinedToSchema(schema) {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}

function decorateToCatchUndefined(fn, hint) {
  if (typeof fn === 'undefined') {
    // eslint-disable-next-line no-param-reassign
    fn = defaultResolveFn;
  }
  return (...args) => {
    const result = fn(...args);
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
function runAtMostOncePerRequest(fn) {
  let value;
  const randomNumber = Math.random();
  return (root, args, ctx, info) => {
    if (!info.operation.__runAtMostOnce) {
      // eslint-disable-next-line no-param-reassign
      info.operation.__runAtMostOnce = {};
    }
    if (!info.operation.__runAtMostOnce[randomNumber]) {
      // eslint-disable-next-line no-param-reassign
      info.operation.__runAtMostOnce[randomNumber] = true;
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
function defaultResolveFn(source, args, context, { fieldName }) {
  // ensure source is a value for which property access is acceptable.
  if (typeof source === 'object' || typeof source === 'function') {
    const property = source[fieldName];
    return typeof property === 'function' ? source[fieldName]() : property;
  }
  return undefined;
}

export {
  generateSchema, // TODO deprecated, remove for v 0.4.x
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
