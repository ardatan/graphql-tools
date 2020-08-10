---
id: "_load_src_index_"
title: "load/src/index"
sidebar_label: "load/src/index"
---

## Index

### Type aliases

* [LoadSchemaOptions](_load_src_index_.md#loadschemaoptions)
* [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions)
* [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)

### Variables

* [NON_OPERATION_KINDS](_load_src_index_.md#const-non_operation_kinds)
* [OPERATION_KINDS](_load_src_index_.md#const-operation_kinds)

### Functions

* [loadDocuments](_load_src_index_.md#loaddocuments)
* [loadDocumentsSync](_load_src_index_.md#loaddocumentssync)
* [loadSchema](_load_src_index_.md#loadschema)
* [loadSchemaSync](_load_src_index_.md#loadschemasync)
* [loadTypedefs](_load_src_index_.md#loadtypedefs)
* [loadTypedefsSync](_load_src_index_.md#loadtypedefssync)

## Type aliases

###  LoadSchemaOptions

Ƭ **LoadSchemaOptions**: *BuildSchemaOptions & [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions) & Partial‹[MergeSchemasConfig](../interfaces/_merge_src_index_.mergeschemasconfig.md)› & object*

*Defined in [packages/load/src/schema.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L7)*

___

###  LoadTypedefsOptions

Ƭ **LoadTypedefsOptions**: *[SingleFileOptions](_utils_src_index_.md#singlefileoptions) & ExtraConfig & object*

*Defined in [packages/load/src/load-typedefs.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L10)*

___

###  UnnormalizedTypeDefPointer

Ƭ **UnnormalizedTypeDefPointer**: *object | string*

*Defined in [packages/load/src/load-typedefs.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L19)*

## Variables

### `Const` NON_OPERATION_KINDS

• **NON_OPERATION_KINDS**: *any[]* = Object.keys(Kind)
  .reduce((prev, v) => [...prev, Kind[v]], [])
  .filter(v => !OPERATION_KINDS.includes(v))

*Defined in [packages/load/src/documents.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L13)*

Kinds of AST nodes that are included in type system definition documents

___

### `Const` OPERATION_KINDS

• **OPERATION_KINDS**: *("OperationDefinition" | "FragmentDefinition")[]* = [Kind.OPERATION_DEFINITION, Kind.FRAGMENT_DEFINITION]

*Defined in [packages/load/src/documents.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L8)*

Kinds of AST nodes that are included in executable documents

## Functions

###  loadDocuments

▸ **loadDocuments**(`pointerOrPointers`: [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[], `options`: [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions)): *Promise‹[Source](../interfaces/_utils_src_index_.source.md)[]›*

*Defined in [packages/load/src/documents.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L25)*

Asynchronously loads executable documents (i.e. operations and fragments) from
the provided pointers. The pointers may be individual files or a glob pattern.
The files themselves may be `.graphql` files or `.js` and `.ts` (in which
case they will be parsed using graphql-tag-pluck).

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`pointerOrPointers` | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) &#124; [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[] | Pointers to the files to load the documents from |
`options` | [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions) | Additional options  |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source.md)[]›*

___

###  loadDocumentsSync

▸ **loadDocumentsSync**(`pointerOrPointers`: [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[], `options`: [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions)): *[Source](../interfaces/_utils_src_index_.source.md)[]*

*Defined in [packages/load/src/documents.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L40)*

Synchronously loads executable documents (i.e. operations and fragments) from
the provided pointers. The pointers may be individual files or a glob pattern.
The files themselves may be `.graphql` files or `.js` and `.ts` (in which
case they will be parsed using graphql-tag-pluck).

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`pointerOrPointers` | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) &#124; [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[] | Pointers to the files to load the documents from |
`options` | [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions) | Additional options  |

**Returns:** *[Source](../interfaces/_utils_src_index_.source.md)[]*

___

###  loadSchema

▸ **loadSchema**(`schemaPointers`: [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[], `options`: [LoadSchemaOptions](_load_src_index_.md#loadschemaoptions)): *Promise‹GraphQLSchema›*

*Defined in [packages/load/src/schema.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L23)*

Asynchronously loads a schema from the provided pointers.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`schemaPointers` | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) &#124; [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[] | Pointers to the sources to load the schema from |
`options` | [LoadSchemaOptions](_load_src_index_.md#loadschemaoptions) | Additional options  |

**Returns:** *Promise‹GraphQLSchema›*

___

###  loadSchemaSync

▸ **loadSchemaSync**(`schemaPointers`: [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[], `options`: [LoadSchemaOptions](_load_src_index_.md#loadschemaoptions)): *GraphQLSchema*

*Defined in [packages/load/src/schema.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L53)*

Synchronously loads a schema from the provided pointers.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`schemaPointers` | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) &#124; [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[] | Pointers to the sources to load the schema from |
`options` | [LoadSchemaOptions](_load_src_index_.md#loadschemaoptions) | Additional options  |

**Returns:** *GraphQLSchema*

___

###  loadTypedefs

▸ **loadTypedefs**‹**AdditionalConfig**›(`pointerOrPointers`: [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[], `options`: [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions)‹Partial‹AdditionalConfig››): *Promise‹[Source](../interfaces/_utils_src_index_.source.md)[]›*

*Defined in [packages/load/src/load-typedefs.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L28)*

Asynchronously loads any GraphQL documents (i.e. executable documents like
operations and fragments as well as type system definitions) from the
provided pointers.

**Type parameters:**

▪ **AdditionalConfig**

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`pointerOrPointers` | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) &#124; [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[] | Pointers to the sources to load the documents from |
`options` | [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions)‹Partial‹AdditionalConfig›› | Additional options  |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source.md)[]›*

___

###  loadTypedefsSync

▸ **loadTypedefsSync**‹**AdditionalConfig**›(`pointerOrPointers`: [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[], `options`: [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions)‹Partial‹AdditionalConfig››): *[Source](../interfaces/_utils_src_index_.source.md)[]*

*Defined in [packages/load/src/load-typedefs.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L73)*

Synchronously loads any GraphQL documents (i.e. executable documents like
operations and fragments as well as type system definitions) from the
provided pointers.

**Type parameters:**

▪ **AdditionalConfig**

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`pointerOrPointers` | [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer) &#124; [UnnormalizedTypeDefPointer](_load_src_index_.md#unnormalizedtypedefpointer)[] | Pointers to the sources to load the documents from |
`options` | [LoadTypedefsOptions](_load_src_index_.md#loadtypedefsoptions)‹Partial‹AdditionalConfig›› | Additional options  |

**Returns:** *[Source](../interfaces/_utils_src_index_.source.md)[]*
