import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLLeafType,
  GraphQLString,
  versionInfo,
} from 'graphql';
import { VariableValues } from '@graphql-tools/utils';

export const isGraphQL17 = versionInfo.major >= 17;

export const EMPTY_ARGS: { [argument: string]: unknown } = Object.freeze(Object.create(null));
export const EMPTY_VARIABLE_VALUES: VariableValues = Object.freeze({
  coerced: Object.freeze(Object.create(null)),
  sources: Object.freeze(Object.create(null)),
});

export const INCREMENTAL_DIRECTIVES = new Set(['defer', 'stream']);

export const BUILTIN_LEAF_TYPES = new Set<GraphQLLeafType>([
  GraphQLBoolean,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLID,
]);

export const EMPTY_RAW_VARIABLES: { readonly [key: string]: unknown } = Object.freeze(
  Object.create(null),
);
