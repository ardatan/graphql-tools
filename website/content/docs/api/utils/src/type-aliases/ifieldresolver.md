---
title: "IFieldResolver"
description: "The IFieldResolver type alias exported by @graphql-tools/utils."
---

> **IFieldResolver**\<`TSource`, `TContext`, `TArgs`, `TReturn`\> = (`source`, `args`, `context`, `info`) => `TReturn`

Defined in: [packages/utils/src/Interfaces.ts:304](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L304)

## Type Parameters

### TSource

`TSource`

### TContext

`TContext`

### TArgs

`TArgs` = `Record`\<`string`, `any`\>

### TReturn

`TReturn` = `any`

## Parameters

### source

`TSource`

### args

`TArgs`

### context

`TContext`

### info

[`GraphQLResolveInfo`](/docs/api/utils/src/interfaces/graphqlresolveinfo)

## Returns

`TReturn`
