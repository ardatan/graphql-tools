---
id: "_utils_src_index_.iaddresolverstoschemaoptions"
title: "IAddResolversToSchemaOptions"
sidebar_label: "IAddResolversToSchemaOptions"
---

Configuration object for adding resolvers to a schema

## Hierarchy

* **IAddResolversToSchemaOptions**

## Index

### Properties

* [defaultFieldResolver](_utils_src_index_.iaddresolverstoschemaoptions.md#optional-defaultfieldresolver)
* [inheritResolversFromInterfaces](_utils_src_index_.iaddresolverstoschemaoptions.md#optional-inheritresolversfrominterfaces)
* [resolverValidationOptions](_utils_src_index_.iaddresolverstoschemaoptions.md#optional-resolvervalidationoptions)
* [resolvers](_utils_src_index_.iaddresolverstoschemaoptions.md#resolvers)
* [schema](_utils_src_index_.iaddresolverstoschemaoptions.md#schema)
* [updateResolversInPlace](_utils_src_index_.iaddresolverstoschemaoptions.md#optional-updateresolversinplace)

## Properties

### `Optional` defaultFieldResolver

• **defaultFieldResolver**? : *[IFieldResolver](../modules/_utils_src_index_.md#ifieldresolver)‹any, any›*

*Defined in [packages/utils/src/Interfaces.ts:133](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L133)*

Override the default field resolver provided by `graphql-js`

___

### `Optional` inheritResolversFromInterfaces

• **inheritResolversFromInterfaces**? : *boolean*

*Defined in [packages/utils/src/Interfaces.ts:142](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L142)*

GraphQL object types that implement interfaces will inherit any missing
resolvers from their interface types defined in the `resolvers` object

___

### `Optional` resolverValidationOptions

• **resolverValidationOptions**? : *[IResolverValidationOptions](_utils_src_index_.iresolvervalidationoptions)*

*Defined in [packages/utils/src/Interfaces.ts:137](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L137)*

Additional options for validating the provided resolvers

___

###  resolvers

• **resolvers**: *[IResolvers](../modules/_utils_src_index_.md#iresolvers)*

*Defined in [packages/utils/src/Interfaces.ts:129](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L129)*

Object describing the field resolvers to add to the provided schema

___

###  schema

• **schema**: *GraphQLSchema*

*Defined in [packages/utils/src/Interfaces.ts:125](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L125)*

The schema to which to add resolvers

___

### `Optional` updateResolversInPlace

• **updateResolversInPlace**? : *boolean*

*Defined in [packages/utils/src/Interfaces.ts:146](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L146)*

Set to `true` to modify the existing schema instead of creating a new one
