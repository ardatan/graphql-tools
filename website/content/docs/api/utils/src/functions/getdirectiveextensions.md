---
title: "getDirectiveExtensions"
description: "The getDirectiveExtensions function exported by @graphql-tools/utils."
---

> **getDirectiveExtensions**\<`TDirectiveAnnotationsMap`\>(`directableObj`, `schema?`, `pathToDirectivesInExtensions?`): \{ \[directiveName in string \| number \| symbol\]?: TDirectiveAnnotationsMap\[directiveName\]\[\] \}

Defined in: [packages/utils/src/getDirectiveExtensions.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/getDirectiveExtensions.ts#L16)

## Type Parameters

### TDirectiveAnnotationsMap

`TDirectiveAnnotationsMap` *extends* `object`

## Parameters

### directableObj

[`DirectableObject`](/docs/api/utils/src/type-aliases/directableobject)

### schema?

`GraphQLSchema`

### pathToDirectivesInExtensions?

`string`[] = `...`

## Returns

\{ \[directiveName in string \| number \| symbol\]?: TDirectiveAnnotationsMap\[directiveName\]\[\] \}
