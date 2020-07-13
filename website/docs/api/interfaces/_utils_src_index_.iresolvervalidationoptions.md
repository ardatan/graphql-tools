---
id: "_utils_src_index_.iresolvervalidationoptions"
title: "IResolverValidationOptions"
sidebar_label: "IResolverValidationOptions"
---

Options for validating resolvers

## Hierarchy

* **IResolverValidationOptions**

## Index

### Properties

* [allowResolversNotInSchema](_utils_src_index_.iresolvervalidationoptions.md#optional-allowresolversnotinschema)
* [requireResolversForAllFields](_utils_src_index_.iresolvervalidationoptions.md#optional-requireresolversforallfields)
* [requireResolversForArgs](_utils_src_index_.iresolvervalidationoptions.md#optional-requireresolversforargs)
* [requireResolversForNonScalar](_utils_src_index_.iresolvervalidationoptions.md#optional-requireresolversfornonscalar)
* [requireResolversForResolveType](_utils_src_index_.iresolvervalidationoptions.md#optional-requireresolversforresolvetype)

## Properties

### `Optional` allowResolversNotInSchema

• **allowResolversNotInSchema**? : *boolean*

*Defined in [packages/utils/src/Interfaces.ts:115](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L115)*

Set to `false` to require all defined resolvers to match fields that
actually exist in the schema. Defaults to `true`.

___

### `Optional` requireResolversForAllFields

• **requireResolversForAllFields**? : *boolean*

*Defined in [packages/utils/src/Interfaces.ts:105](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L105)*

Set to `true` to require a resolver for be defined for all fields defined
in the schema. Defaults to `false`.

___

### `Optional` requireResolversForArgs

• **requireResolversForArgs**? : *boolean*

*Defined in [packages/utils/src/Interfaces.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L95)*

Set to `true` to require a resolver to be defined for any field that has
arguments. Defaults to `false`.

___

### `Optional` requireResolversForNonScalar

• **requireResolversForNonScalar**? : *boolean*

*Defined in [packages/utils/src/Interfaces.ts:100](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L100)*

Set to `true` to require a resolver to be defined for any field which has
a return type that isn't a scalar. Defaults to `false`.

___

### `Optional` requireResolversForResolveType

• **requireResolversForResolveType**? : *boolean*

*Defined in [packages/utils/src/Interfaces.ts:110](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L110)*

Set to `true` to require a `resolveType()` for Interface and Union types.
Defaults to `false`.
