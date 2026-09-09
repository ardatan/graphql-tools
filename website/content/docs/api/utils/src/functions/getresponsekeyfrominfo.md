---
title: "getResponseKeyFromInfo"
description: "The getResponseKeyFromInfo function exported by @graphql-tools/utils."
---

> **getResponseKeyFromInfo**(`info`): `string`

Defined in: [packages/utils/src/getResponseKeyFromInfo.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/getResponseKeyFromInfo.ts#L8)

Get the key under which the result of this resolver will be placed in the response JSON. Basically, just
resolves aliases.

## Parameters

### info

[`GraphQLResolveInfo`](/docs/api/utils/src/interfaces/graphqlresolveinfo)

The info argument to the resolver.

## Returns

`string`
