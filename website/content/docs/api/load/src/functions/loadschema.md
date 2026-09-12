---
title: "loadSchema"
description: "The loadSchema function exported by @graphql-tools/load."
---

> **loadSchema**(`schemaPointers`, `options`): `Promise`\<`GraphQLSchema`\>

Defined in: [packages/load/src/schema.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L44)

Asynchronously loads a schema from the provided pointers.

## Parameters

### schemaPointers

[`UnnormalizedTypeDefPointer`](/docs/api/load/src/type-aliases/unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](/docs/api/load/src/type-aliases/unnormalizedtypedefpointer)[]

Pointers to the sources to load the schema from

### options

[`LoadSchemaOptions`](/docs/api/load/src/type-aliases/loadschemaoptions)

Additional options

## Returns

`Promise`\<`GraphQLSchema`\>
