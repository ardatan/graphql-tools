---
title: "loadDocumentsSync"
description: "The loadDocumentsSync function exported by @graphql-tools/load."
---

> **loadDocumentsSync**(`pointerOrPointers`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/load/src/documents.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L51)

Synchronously loads executable documents (i.e. operations and fragments) from
the provided pointers. The pointers may be individual files or a glob pattern.
The files themselves may be `.graphql` files or `.js` and `.ts` (in which
case they will be parsed using graphql-tag-pluck).

## Parameters

### pointerOrPointers

[`UnnormalizedTypeDefPointer`](/docs/api/load/src/type-aliases/unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](/docs/api/load/src/type-aliases/unnormalizedtypedefpointer)[]

Pointers to the files to load the documents from

### options

[`LoadTypedefsOptions`](/docs/api/load/src/type-aliases/loadtypedefsoptions)

Additional options

## Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]
