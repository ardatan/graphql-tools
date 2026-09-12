---
title: "mergeResolvers"
description: "The mergeResolvers function exported by @graphql-tools/merge."
---

> **mergeResolvers**\<`TSource`, `TContext`\>(`resolversDefinitions`, `options?`): [`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)\<`TSource`, `TContext`\>

Defined in: [packages/merge/src/merge-resolvers.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-resolvers.ts#L39)

Deep merges multiple resolver definition objects into a single definition.

## Type Parameters

### TSource

`TSource`

### TContext

`TContext`

## Parameters

### resolversDefinitions

[`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)\<`TSource`, `TContext`\> \| [`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<[`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)\<`TSource`, `TContext`\>\>[] \| `null` \| `undefined`

Resolver definitions to be merged

### options?

[`MergeResolversOptions`](/docs/api/merge/src/interfaces/mergeresolversoptions)

Additional options

```js
const { mergeResolvers } = require('@graphql-tools/merge');
const clientResolver = require('./clientResolver');
const productResolver = require('./productResolver');

const resolvers = mergeResolvers([
 clientResolver,
 productResolver,
]);
```

If you don't want to manually create the array of resolver objects, you can
also use this function along with loadFiles:

```js
const path = require('path');
const { mergeResolvers } = require('@graphql-tools/merge');
const { loadFilesSync } = require('@graphql-tools/load-files');

const resolversArray = loadFilesSync(path.join(__dirname, './resolvers'));

const resolvers = mergeResolvers(resolversArray)
```

## Returns

[`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)\<`TSource`, `TContext`\>
