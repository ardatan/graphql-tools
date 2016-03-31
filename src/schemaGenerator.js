// Generates a schema for graphql-js given a shorthand schema

import { parse } from '../../graphql-js/src/language';
import { buildASTSchema } from '../../graphql-js/src/utilities';

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
function ResolveError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
ResolveError.prototype = Error;


const generateSchema = (schemaDefinition, resolveFunctions = {}) => {
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

  // TODO throw error if not all fields with args have resolvers. warn for types

  return schema;
};

export { generateSchema, ResolveError };
