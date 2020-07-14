---
id: "_utils_src_index_.pruneschemaoptions"
title: "PruneSchemaOptions"
sidebar_label: "PruneSchemaOptions"
---

Options for removing unused types from the schema

## Hierarchy

* **PruneSchemaOptions**

## Index

### Properties

* [skipEmptyCompositeTypePruning](_utils_src_index_.pruneschemaoptions.md#optional-skipemptycompositetypepruning)
* [skipEmptyUnionPruning](_utils_src_index_.pruneschemaoptions.md#optional-skipemptyunionpruning)
* [skipUnimplementedInterfacesPruning](_utils_src_index_.pruneschemaoptions.md#optional-skipunimplementedinterfacespruning)
* [skipUnusedTypesPruning](_utils_src_index_.pruneschemaoptions.md#optional-skipunusedtypespruning)

## Properties

### `Optional` skipEmptyCompositeTypePruning

• **skipEmptyCompositeTypePruning**? : *boolean*

*Defined in [packages/utils/src/prune.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/prune.ts#L41)*

Set to `true` to skip pruning object types or interfaces with no no fields

___

### `Optional` skipEmptyUnionPruning

• **skipEmptyUnionPruning**? : *boolean*

*Defined in [packages/utils/src/prune.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/prune.ts#L50)*

Set to `true` to skip pruning empty unions

___

### `Optional` skipUnimplementedInterfacesPruning

• **skipUnimplementedInterfacesPruning**? : *boolean*

*Defined in [packages/utils/src/prune.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/prune.ts#L46)*

Set to `true` to skip pruning interfaces that are not implemented by any
other types

___

### `Optional` skipUnusedTypesPruning

• **skipUnusedTypesPruning**? : *boolean*

*Defined in [packages/utils/src/prune.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/prune.ts#L54)*

Set to `true` to skip pruning unused types
