---
title: "pruneSchema"
description: "The pruneSchema function exported by @graphql-tools/utils."
---

> **pruneSchema**(`schema`, `options?`): `GraphQLSchema`

Defined in: [packages/utils/src/prune.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/prune.ts#L25)

Prunes the provided schema, removing unused and empty types

## Parameters

### schema

`GraphQLSchema`

The schema to prune

### options?

[`PruneSchemaOptions`](/docs/api/utils/src/interfaces/pruneschemaoptions) = `{}`

Additional options for removing unused types from the schema

## Returns

`GraphQLSchema`
