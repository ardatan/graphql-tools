---
title: "locatedError"
description: "The locatedError function exported by @graphql-tools/utils."
---

> **locatedError**(`rawError`, `nodes`, `path`, `info?`): `GraphQLError`

Defined in: [packages/utils/src/errors.ts:91](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/errors.ts#L91)

## Parameters

### rawError

`unknown`

### nodes

`ASTNode` \| readonly `ASTNode`[] \| `undefined`

### path

[`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<readonly (`string` \| `number`)[]\>

### info?

`false` \| `SchemaCoordinateInfo` \| `null`

## Returns

`GraphQLError`
