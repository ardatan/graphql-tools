// Generates a schema for graphql-js given a shorthand schema

import { parse } from 'graphql/language';
import { uniq } from 'lodash';
import { buildASTSchema } from 'graphql/utilities';
import {
  GraphQLScalarType,
  getNamedType,
  GraphQLObjectType,
} from 'graphql/type';
import { decorateWithTracer } from './tracing';

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
function SchemaError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
SchemaError.prototype = new Error;

// type definitions can be a string or an array of strings.
function generateSchema(
  typeDefinitions,
  resolveFunctions,
  logger = null,
  forbidUndefinedInResolve = false,
) {
  if (!typeDefinitions) {
    throw new SchemaError('Must provide typeDefinitions');
  }
  if (!resolveFunctions) {
    throw new SchemaError('Must provide resolveFunctions');
  }

  // TODO: check that typeDefinitions is either string or array of strings

  let schema;
  if (typeof typeDefinitions === 'string') {
    schema = buildSchemaFromTypeDefinitions(typeDefinitions);
  } else {
    if (! Array.isArray(typeDefinitions)) {
      // TODO improve error message and say what type was actually found
      throw new SchemaError('`typeDefinitions` must be a string or array');
    }
    const ctd = concatenateTypeDefs(typeDefinitions);
    schema = buildSchemaFromTypeDefinitions(ctd);
  }

  addResolveFunctionsToSchema(schema, resolveFunctions);

  assertResolveFunctionsPresent(schema);

  if (forbidUndefinedInResolve) {
    addCatchUndefinedToSchema(schema);
  }

  if (logger) {
    addErrorLoggingToSchema(schema, logger);
  }

  return schema;
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
    } else {
      if (typeof typeDef === 'string') {
        resolvedTypeDefinitions.push(typeDef.trim());
      } else {
        const type = typeof typeDef;
        throw new SchemaError(`typeDef array must contain only strings and functions, got ${type}`);
      }
    }
  });
  return uniq(resolvedTypeDefinitions.map((x) => x.trim())).join('\n');
}

function buildSchemaFromTypeDefinitions(typeDefinitions) {
  return buildASTSchema(parse(typeDefinitions));
}

function forEachField(schema, fn) {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach((typeName) => {
    const type = typeMap[typeName];

    if (!getNamedType(type).name.startsWith('__') && type instanceof GraphQLObjectType) {
      const fields = type.getFields();
      Object.keys(fields).forEach((fieldName) => {
        const field = fields[fieldName];
        fn(field, typeName, fieldName);
      });
    }
  });
}

// takes a GraphQL-JS schema and an object of loaders, then attaches
// the loaders to the context by wrapping each query or mutation resolve
// function with a function that attaches loaders if they don't exist.
// attaches loaders only once to make sure they are singletons
function attachLoadersToContext(schema, loaders) {
  const attachLoaderFn = (root, args, ctx) => {
    Object.keys(loaders).forEach((loaderName) => {
      if (!ctx[loaderName]) {
        // eslint-disable-next-line no-param-reassign
        ctx[loaderName] = new loaders[loaderName]();
      }
    });
    return root;
  };
  addSchemaLevelResolveFunction(schema, attachLoaderFn);
}

// wraps all resolve functions of query, mutation or subscription fields
// with the provided function to simulate a root schema level resolve funciton
// CAUTION: this function will run once for each root field, so it behaves
// slightly differently than if it were an actual resolve function.
function addSchemaLevelResolveFunction(schema, fn) {
  const rootTypes = ([
    schema.getQueryType(),
    schema.getMutationType(),
    schema.getSubscriptionType(),
  ]).filter(x => !!x);
  rootTypes.forEach((type) => {
    const fields = type.getFields();
    Object.keys(fields).forEach((fieldName) => {
      fields[fieldName].resolve = wrapResolver(fields[fieldName].resolve, fn);
    });
  });
}

function addResolveFunctionsToSchema(schema, resolveFunctions) {
  Object.keys(resolveFunctions).forEach((typeName) => {
    const type = schema.getType(typeName);
    if (!type) {
      throw new SchemaError(
        `"${typeName}" defined in resolvers, but not in schema`
      );
    }

    Object.keys(resolveFunctions[typeName]).forEach((fieldName) => {
      if (!type.getFields()[fieldName]) {
        throw new SchemaError(
          `${typeName}.${fieldName} defined in resolvers, but not in schema`
        );
      }
      const field = type.getFields()[fieldName];
      field.resolve = resolveFunctions[typeName][fieldName];
    });
  });
}

function assertResolveFunctionsPresent(schema) {
  forEachField(schema, (field, typeName, fieldName) => {
    // requires a resolve function on every field that has arguments
    if (field.args.length > 0) {
      expectResolveFunction(field, typeName, fieldName);
    }

    // requires a resolve function on every field that returns a non-scalar type
    if (!(getNamedType(field.type) instanceof GraphQLScalarType)) {
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
    return innerResolver(root, args, ctx, info);
  };
}
/*
 * fn: The function to decorate with the logger
 * logger: an object instance of type Logger
 * hint: an optional hint to add to the error's message
 */
function decorateWithLogger(fn, logger, hint = '') {
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      if (hint) {
        e.message = `Error in resolver ${hint}\n${e.message}`;
      }
      logger.log(e);
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

function addTracingToResolvers(schema, tracer) {
  forEachField(schema, (field, typeName, fieldName) => {
    const functionName = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateWithTracer(
      field.resolve,
      tracer,
      { functionType: 'resolve', functionName },
    );
  });
}

function decorateToCatchUndefined(fn, hint) {
  return (...args) => {
    const result = fn(...args);
    if (typeof result === 'undefined') {
      throw new Error(`Resolve function for "${hint}" returned undefined`);
    }
    return result;
  };
}

export {
  generateSchema,
  SchemaError,
  forEachField,
  addErrorLoggingToSchema,
  addResolveFunctionsToSchema,
  addCatchUndefinedToSchema,
  assertResolveFunctionsPresent,
  addTracingToResolvers,
  buildSchemaFromTypeDefinitions,
  addSchemaLevelResolveFunction,
  attachLoadersToContext,
};
