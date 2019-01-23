import {
  GraphQLSchema,
  GraphQLField,
  getNamedType,
  GraphQLScalarType,
} from 'graphql';
import { IResolverValidationOptions } from '../Interfaces';

import SchemaError from './SchemaError';
import forEachField from './forEachField';

function assertResolveFunctionsPresent(
  schema: GraphQLSchema,
  resolverValidationOptions: IResolverValidationOptions = {},
) {
  const {
    requireResolversForArgs = false,
    requireResolversForNonScalar = false,
    requireResolversForAllFields = false,
  } = resolverValidationOptions;

  if (
    requireResolversForAllFields &&
    (requireResolversForArgs || requireResolversForNonScalar)
  ) {
    throw new TypeError(
      'requireResolversForAllFields takes precedence over the more specific assertions. ' +
        'Please configure either requireResolversForAllFields or requireResolversForArgs / ' +
        'requireResolversForNonScalar, but not a combination of them.',
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
    if (
      requireResolversForNonScalar &&
      !(getNamedType(field.type) instanceof GraphQLScalarType)
    ) {
      expectResolveFunction(field, typeName, fieldName);
    }
  });
}

function expectResolveFunction(
  field: GraphQLField<any, any>,
  typeName: string,
  fieldName: string,
) {
  if (!field.resolve) {
    console.warn(
      // tslint:disable-next-line: max-line-length
      `Resolve function missing for "${typeName}.${fieldName}". To disable this warning check https://github.com/apollostack/graphql-tools/issues/131`,
    );
    return;
  }
  if (typeof field.resolve !== 'function') {
    throw new SchemaError(
      `Resolver "${typeName}.${fieldName}" must be a function`,
    );
  }
}

export default assertResolveFunctionsPresent;
