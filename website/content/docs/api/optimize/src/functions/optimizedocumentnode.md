---
title: "optimizeDocumentNode"
description: "The optimizeDocumentNode function exported by @graphql-tools/optimize."
---

> **optimizeDocumentNode**(`node`, `optimizers?`): `DocumentNode`

Defined in: [packages/optimize/src/optimize.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/optimize/src/optimize.ts#L16)

This method accept a DocumentNode and applies the optimizations you wish to use.
You can override the default ones or provide you own optimizers if you wish.

## Parameters

### node

`DocumentNode`

document to optimize

### optimizers?

[`DocumentOptimizer`](/docs/api/optimize/src/type-aliases/documentoptimizer)[] = `DEFAULT_OPTIMIZERS`

optional, list of optimizer to use

## Returns

`DocumentNode`
