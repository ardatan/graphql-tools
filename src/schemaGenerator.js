// Generates a schema for graphql-js given a shorthand schema

import { parse } from 'graphql/language';
import { buildASTSchema } from 'graphql/utilities';
import { GraphQLScalarType, getNamedType } from 'graphql/type';

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
function ResolveError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
ResolveError.prototype = new Error;


const generateSchema = (schemaDefinition, resolveFunctions) => {
  if (!schemaDefinition) {
    throw new ResolveError('Must provide schemaDefinition');
  }
  if (!resolveFunctions) {
    throw new ResolveError('Must provide resolveFunctions');
  }
  const ast = parse(schemaDefinition);
  const schema = buildASTSchema(ast);

  if (resolveFunctions) {
    Object.keys(resolveFunctions).forEach((typeName) => {
      const type = schema._typeMap[typeName];
      if (!type) {
        throw new ResolveError(
          `"${typeName}" defined in resolvers, but not in schema`
        );
      }

      Object.keys(resolveFunctions[typeName]).forEach((fieldName) => {
        if (!type._fields[fieldName]) {
          throw new ResolveError(
            `${typeName}.${fieldName} defined in resolvers, but not in schema`
          );
        }
        const field = type._fields[fieldName];
        const resolveFn = resolveFunctions[typeName][fieldName];
        field.resolve = resolveFn;
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

function expectResolveFunction(resolveFunctions, typeName, fieldName) {
  if (!resolveFunctions[typeName] || !resolveFunctions[typeName][fieldName]) {
    throw new ResolveError(`Resolve function missing for "${typeName}.${fieldName}"`);
  }
  if (typeof resolveFunctions[typeName][fieldName] !== 'function') {
    throw new ResolveError(`Resolver "${typeName}.${fieldName}" must be a function`);
  }
}

export { generateSchema, ResolveError };
