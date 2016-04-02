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


const generateSchema = (schemaDefinition, resolveFunctions, logger = null) => {
  if (!schemaDefinition) {
    throw new SchemaError('Must provide schemaDefinition');
  }
  if (!resolveFunctions) {
    throw new SchemaError('Must provide resolveFunctions');
  }
  const ast = parse(schemaDefinition);
  const schema = buildASTSchema(ast);

  if (resolveFunctions) {
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
        const resolveFn = resolveFunctions[typeName][fieldName];
        const errorHint = `Error in resolver: ${typeName}.${fieldName}`;
        field.resolve = decorateWithLogger(resolveFn, logger, errorHint);
      });
    });
  }

  Object.keys(schema._typeMap).forEach((typeName) => {
    const type = schema._typeMap[typeName];

    if (!getNamedType(type).name.startsWith('__') && type._fields) {
      Object.keys(type._fields).forEach((fieldName) => {
        const field = type._fields[fieldName];

        // TODO: provide more helpful error messages
        if (field.args.length > 0) {
          expectResolveFunction(resolveFunctions, typeName, fieldName);
        }

        if (!(getNamedType(field.type) instanceof GraphQLScalarType)) {
          expectResolveFunction(resolveFunctions, typeName, fieldName);
        }
      });
    }
  });

  return schema;
};

/*
 * fn: The function to decorate with the logger
 * logger: an object instance of type Logger
 * hint: an optional hint to add to the error's message
 */
function decorateWithLogger(fn, logger, hint) {
  if (! logger instanceof Logger) {
    return fn;
  }
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      if (hint) {
        e.message = `${hint}\n${e.message}`;
      }
      logger.log(e);
    }
    return null;
  };
}

function expectResolveFunction(resolveFunctions, typeName, fieldName) {
  if (!resolveFunctions[typeName] || !resolveFunctions[typeName][fieldName]) {
    throw new SchemaError(`Resolve function missing for "${typeName}.${fieldName}"`);
  }
  if (typeof resolveFunctions[typeName][fieldName] !== 'function') {
    throw new SchemaError(`Resolver "${typeName}.${fieldName}" must be a function`);
  }
}

export { generateSchema, SchemaError };
