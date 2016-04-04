// Generates a schema for graphql-js given a shorthand schema

import { parse } from 'graphql/language';
import { buildASTSchema } from 'graphql/utilities';
import { GraphQLScalarType, getNamedType } from 'graphql/type';
import { Logger } from './Logger.js';

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
function SchemaError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
SchemaError.prototype = new Error;


const generateSchema = (
  schemaDefinition,
  resolveFunctions,
  logger = null,
  forbidUndefinedInResolve = false,
) => {
  if (!schemaDefinition) {
    throw new SchemaError('Must provide schemaDefinition');
  }
  if (!resolveFunctions) {
    throw new SchemaError('Must provide resolveFunctions');
  }
  const ast = parse(schemaDefinition);
  const schema = buildASTSchema(ast);

  addResolveFunctionsToSchema(schema, resolveFunctions, forbidUndefinedInResolve, logger);

  assertResolveFunctionsPresent(schema);

  if (forbidUndefinedInResolve) {
    addCatchUndefinedToSchema(schema);
  }

  if (logger) {
    addErrorLoggingToSchema(schema, logger);
  }

  return schema;
};

function forEachField(schema, fn) {
  Object.keys(schema._typeMap).forEach((typeName) => {
    const type = schema._typeMap[typeName];

    if (!getNamedType(type).name.startsWith('__') && type._fields) {
      Object.keys(type._fields).forEach((fieldName) => {
        const field = type._fields[fieldName];
        fn(field, typeName, fieldName);
      });
    }
  });
}

function addResolveFunctionsToSchema(schema, resolveFunctions) {
  Object.keys(resolveFunctions).forEach((typeName) => {
    const type = schema._typeMap[typeName];
    if (!type) {
      throw new SchemaError(
        `"${typeName}" defined in resolvers, but not in schema`
      );
    }

    Object.keys(resolveFunctions[typeName]).forEach((fieldName) => {
      if (!type._fields[fieldName]) {
        throw new SchemaError(
          `${typeName}.${fieldName} defined in resolvers, but not in schema`
        );
      }
      const field = type._fields[fieldName];
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
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
  });
}

function addCatchUndefinedToSchema(schema) {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}

/*
 * fn: The function to decorate with the logger
 * logger: an object instance of type Logger
 * hint: an optional hint to add to the error's message
 */
function decorateWithLogger(fn, logger, hint) {
  if (logger === null) {
    return fn;
  }
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

function decorateToCatchUndefined(fn, hint) {
  return (...args) => {
    const result = fn(...args);
    if (typeof result === 'undefined') {
      throw new Error(`Resolve function for "${hint}" returned undefined`);
    }
    return result;
  };
}

export { generateSchema, SchemaError };
