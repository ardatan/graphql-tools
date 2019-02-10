// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
export default class SchemaError extends Error {
  public message: string;

  constructor(message: string) {
    super(message);
    this.message = message;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
