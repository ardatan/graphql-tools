// Produce the GraphQL query recommended for a full schema introspection.
export { getIntrospectionQuery } from './getIntrospectionQuery.js';

export type {
  IntrospectionOptions,
  IntrospectionQuery,
  IntrospectionSchema,
  IntrospectionType,
  IntrospectionInputType,
  IntrospectionOutputType,
  IntrospectionScalarType,
  IntrospectionObjectType,
  IntrospectionInterfaceType,
  IntrospectionUnionType,
  IntrospectionEnumType,
  IntrospectionInputObjectType,
  IntrospectionTypeRef,
  IntrospectionInputTypeRef,
  IntrospectionOutputTypeRef,
  IntrospectionNamedTypeRef,
  IntrospectionListTypeRef,
  IntrospectionNonNullTypeRef,
  IntrospectionField,
  IntrospectionInputValue,
  IntrospectionEnumValue,
  IntrospectionDirective,
} from './getIntrospectionQuery.js';

// Convert a GraphQLSchema to an IntrospectionQuery.
export { introspectionFromSchema } from './introspectionFromSchema.js';

// Build a GraphQLSchema from an introspection result.
export { buildClientSchema } from './buildClientSchema.js';

// Gets the target Operation from a Document.
export { getOperationAST } from './getOperationAST.js';

// Gets the Type for the target Operation AST.
export { getOperationRootType } from './getOperationRootType.js';

// Build a GraphQLSchema from GraphQL Schema language.
export { buildASTSchema, buildSchema } from './buildASTSchema.js';
export type { BuildSchemaOptions } from './buildASTSchema.js';

// Extends an existing GraphQLSchema from a parsed GraphQL Schema language AST.
export { extendSchema } from './extendSchema.js';

// Sort a GraphQLSchema.
export { lexicographicSortSchema } from './lexicographicSortSchema.js';

// Print a GraphQLSchema to GraphQL Schema language.
export { printSchema, printType, printIntrospectionSchema } from './printSchema.js';

// Create a GraphQLType from a GraphQL language AST.
export { typeFromAST } from './typeFromAST.js';

// Create a JavaScript value from a GraphQL language AST with a type.
export { valueFromAST } from './valueFromAST.js';

// Create a JavaScript value from a GraphQL language AST without a type.
export { valueFromASTUntyped } from './valueFromASTUntyped.js';

// Create a GraphQL language AST from a JavaScript value.
export { astFromValue } from './astFromValue.js';

// A helper to use within recursive-descent visitors which need to be aware of the GraphQL type system.
export { TypeInfo, visitWithTypeInfo } from './TypeInfo.js';

// Coerces a JavaScript value to a GraphQL type, or produces errors.
export { coerceInputValue } from './coerceInputValue.js';

// Concatenates multiple AST together.
export { concatAST } from './concatAST.js';

// Separates an AST into an AST per Operation.
export { separateOperations } from './separateOperations.js';

// Strips characters that are not significant to the validity or execution of a GraphQL document.
export { stripIgnoredCharacters } from './stripIgnoredCharacters.js';

// Comparators for types
export { isEqualType, isTypeSubTypeOf, doTypesOverlap } from './typeComparators.js';

// Compares two GraphQLSchemas and detects breaking changes.
export {
  BreakingChangeType,
  DangerousChangeType,
  findBreakingChanges,
  findDangerousChanges,
} from './findBreakingChanges.js';
export type { BreakingChange, DangerousChange } from './findBreakingChanges.js';

// Asserts that a string is a valid GraphQL name
export { assertValidName, isValidNameError } from './assertValidName.js';

// Wrapper type that contains DocumentNode and types that can be deduced from it.
export type { TypedQueryDocumentNode } from './typedQueryDocumentNode.js';

// Utility function for adding resolvers to a schema object.
export { addResolversToExistingSchema } from './addResolversToSchema.js';

// Get DocumentNode from a GraphQLSchema object.
export { getDocumentNodeFromSchema } from './getDocumentNodeFromSchema';

// Better backwards compat print function
export { printSchemaWithDirectives } from './printSchemaWithDirectives';

export { getRootTypeMap } from './getRootTypeMap';

export {
  astFromArg,
  astFromDirective,
  astFromEnumType,
  astFromEnumValue,
  astFromField,
  astFromInputField,
  astFromInputObjectType,
  astFromInterfaceType,
  astFromObjectType,
  astFromScalarType,
  astFromSchema,
  astFromType,
  astFromUnionType,
  astFromValueUntyped,
} from './astFromSchema';
