---
id: "_schema_src_index_.iexecutableschemadefinition"
title: "IExecutableSchemaDefinition"
sidebar_label: "IExecutableSchemaDefinition"
---

Configuration object for creating an executable schema

## Type parameters

▪ **TContext**

## Hierarchy

* **IExecutableSchemaDefinition**

## Index

### Properties

* [allowUndefinedInResolve](_schema_src_index_.iexecutableschemadefinition.md#optional-allowundefinedinresolve)
* [directiveResolvers](_schema_src_index_.iexecutableschemadefinition.md#optional-directiveresolvers)
* [inheritResolversFromInterfaces](_schema_src_index_.iexecutableschemadefinition.md#optional-inheritresolversfrominterfaces)
* [logger](_schema_src_index_.iexecutableschemadefinition.md#optional-logger)
* [parseOptions](_schema_src_index_.iexecutableschemadefinition.md#optional-parseoptions)
* [pruningOptions](_schema_src_index_.iexecutableschemadefinition.md#optional-pruningoptions)
* [resolverValidationOptions](_schema_src_index_.iexecutableschemadefinition.md#optional-resolvervalidationoptions)
* [resolvers](_schema_src_index_.iexecutableschemadefinition.md#optional-resolvers)
* [schemaDirectives](_schema_src_index_.iexecutableschemadefinition.md#optional-schemadirectives)
* [schemaTransforms](_schema_src_index_.iexecutableschemadefinition.md#optional-schematransforms)
* [typeDefs](_schema_src_index_.iexecutableschemadefinition.md#typedefs)

## Properties

### `Optional` allowUndefinedInResolve

• **allowUndefinedInResolve**? : *boolean*

*Defined in [packages/schema/src/types.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L37)*

Set to `false` to have resolvers throw an if they return undefined, which
can help make debugging easier

___

### `Optional` directiveResolvers

• **directiveResolvers**? : *[IDirectiveResolvers](_utils_src_index_.idirectiveresolvers)‹any, TContext›*

*Defined in [packages/schema/src/types.ts:45](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L45)*

Map of directive resolvers

___

### `Optional` inheritResolversFromInterfaces

• **inheritResolversFromInterfaces**? : *boolean*

*Defined in [packages/schema/src/types.ts:64](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L64)*

GraphQL object types that implement interfaces will inherit any missing
resolvers from their interface types defined in the `resolvers` object

___

### `Optional` logger

• **logger**? : *[ILogger](_schema_src_index_.ilogger)*

*Defined in [packages/schema/src/types.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L32)*

Logger instance used to print errors to the server console that are
usually swallowed by GraphQL.

___

### `Optional` parseOptions

• **parseOptions**? : *[GraphQLParseOptions](_utils_src_index_.graphqlparseoptions)*

*Defined in [packages/schema/src/types.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L59)*

Additional options for parsing the type definitions if they are provided
as a string

___

### `Optional` pruningOptions

• **pruningOptions**? : *[PruneSchemaOptions](_utils_src_index_.pruneschemaoptions)*

*Defined in [packages/schema/src/types.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L68)*

Additional options for removing unused types from the schema

___

### `Optional` resolverValidationOptions

• **resolverValidationOptions**? : *[IResolverValidationOptions](_utils_src_index_.iresolvervalidationoptions)*

*Defined in [packages/schema/src/types.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L41)*

Additional options for validating the provided resolvers

___

### `Optional` resolvers

• **resolvers**? : *[IResolvers](../modules/_utils_src_index_.md#iresolvers)‹any, TContext› | Array‹[IResolvers](../modules/_utils_src_index_.md#iresolvers)‹any, TContext››*

*Defined in [packages/schema/src/types.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L27)*

Object describing the field resolvers for the provided type definitions

___

### `Optional` schemaDirectives

• **schemaDirectives**? : *Record‹string, [SchemaDirectiveVisitorClass](../modules/_utils_src_index_.md#schemadirectivevisitorclass)›*

*Defined in [packages/schema/src/types.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L50)*

A map of schema directives used with the legacy class-based implementation
of schema directives

___

### `Optional` schemaTransforms

• **schemaTransforms**? : *Array‹[SchemaTransform](../modules/_utils_src_index_.md#schematransform)›*

*Defined in [packages/schema/src/types.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L54)*

An array of schema transformation functions

___

###  typeDefs

• **typeDefs**: *[ITypeDefinitions](../modules/_utils_src_index_.md#itypedefinitions)*

*Defined in [packages/schema/src/types.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L23)*

The type definitions used to create the schema
