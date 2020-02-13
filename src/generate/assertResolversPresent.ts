import {
  GraphQLSchema,
  GraphQLField,
  getNamedType,
  GraphQLScalarType,
} from 'graphql';

import { IResolverValidationOptions } from '../Interfaces';
import { forEachField } from '../utils';

import SchemaError from './SchemaError';

function assertResolversPresent(
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
    // requires a resolver for *every* field.
    if (requireResolversForAllFields) {
      expectResolver(field, typeName, fieldName);
    }

    // requires a resolver on every field that has arguments
    if (requireResolversForArgs && field.args.length > 0) {
      expectResolver(field, typeName, fieldName);
    }

    // requires a resolver on every field that returns a non-scalar type
    if (
      requireResolversForNonScalar &&
      !(getNamedType(field.type) instanceof GraphQLScalarType)
    ) {
      expectResolver(field, typeName, fieldName);
    }
  });
}

function expectResolver(
  field: GraphQLField<any, any>,
  typeName: string,
  fieldName: string,
) {
  if (!field.resolve) {
    // eslint-disable-next-line no-console
    console.warn(
      `Resolver missing for "${typeName}.${fieldName}". To disable this warning check https://github.com/apollostack/graphql-tools/issues/131`,
    );
    return;
  }
  if (typeof field.resolve !== 'function') {
    throw new SchemaError(
      `Resolver "${typeName}.${fieldName}" must be a function`,
    );
  }
}

export default assertResolversPresent;
