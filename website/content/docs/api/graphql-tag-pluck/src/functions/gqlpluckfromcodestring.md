---
title: "gqlPluckFromCodeString"
description: "The gqlPluckFromCodeString function exported by @graphql-tools/graphql-tag-pluck."
---

> **gqlPluckFromCodeString**(`filePath`, `code`, `options?`): `Promise`\<`Source`[]\>

Defined in: [packages/graphql-tag-pluck/src/index.ts:234](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L234)

Asynchronously plucks GraphQL template literals from a single file.

Supported file extensions include: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`, `.svelte`, `.astro`

## Parameters

### filePath

`string`

Path to the file containing the code. Required to detect the file type

### code

`string`

The contents of the file being parsed.

### options?

[`GraphQLTagPluckOptions`](/docs/api/graphql-tag-pluck/src/interfaces/graphqltagpluckoptions) = `{}`

Additional options for determining how a file is parsed.

## Returns

`Promise`\<`Source`[]\>
