---
title: "LoadSchemaOptions"
description: "The LoadSchemaOptions type alias exported by @graphql-tools/load."
---

> **LoadSchemaOptions** = `BuildSchemaOptions` & [`LoadTypedefsOptions`](/docs/api/load/src/type-aliases/loadtypedefsoptions) & `Partial`\<[`IExecutableSchemaDefinition`](/docs/api/schema/src/interfaces/iexecutableschemadefinition)\> & `object`

Defined in: [packages/load/src/schema.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L28)

## Type Declaration

### includeSources?

> `optional` **includeSources?**: `boolean`

Adds a list of Sources in to `extensions.sources`

Disabled by default.
