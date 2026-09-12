---
title: "PruneSchemaOptions"
description: "The PruneSchemaOptions interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/types.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L39)

Options for removing unused types from the schema

## Properties

### skipEmptyCompositeTypePruning?

> `optional` **skipEmptyCompositeTypePruning?**: `boolean`

Defined in: [packages/utils/src/types.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L49)

Set to `true` to skip pruning object types or interfaces with no no fields

***

### skipEmptyUnionPruning?

> `optional` **skipEmptyUnionPruning?**: `boolean`

Defined in: [packages/utils/src/types.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L58)

Set to `true` to skip pruning empty unions

***

### skipPruning?

> `optional` **skipPruning?**: [`PruneSchemaFilter`](/docs/api/utils/src/type-aliases/pruneschemafilter)

Defined in: [packages/utils/src/types.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L44)

Return true to skip pruning this type. This check will run first before any other options.
This can be helpful for schemas that support type extensions like Apollo Federation.

***

### skipUnimplementedInterfacesPruning?

> `optional` **skipUnimplementedInterfacesPruning?**: `boolean`

Defined in: [packages/utils/src/types.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L54)

Set to `true` to skip pruning interfaces that are not implemented by any
other types

***

### skipUnusedTypesPruning?

> `optional` **skipUnusedTypesPruning?**: `boolean`

Defined in: [packages/utils/src/types.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L62)

Set to `true` to skip pruning unused types
