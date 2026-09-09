---
title: "GraphQLResolveInfoHelpers"
description: "The GraphQLResolveInfoHelpers interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/Interfaces.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L79)

## Properties

### promiseAll

> `readonly` **promiseAll**: \<`T`\>(`values`) => `Promise`\<`T`[]\>

Defined in: [packages/utils/src/Interfaces.ts:102](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L102)

Promise.all wrapper that allows rejected branches to be tracked
as execution async work.

Intended use: return or await this promise from resolver work.
Un-awaited async side effects are an anti-pattern:

  const { promiseAll } = info.getAsyncHelpers();
  promiseAll([someAsyncWork(), someOtherAsyncWork()]).catch(() => undefined);

In that anti-pattern, tracking starts only after rejection (on a
later microtask), so this work is not guaranteed to delay
`hooks.asyncWorkFinished`.

Use `track(...)` for un-awaited async side effects:

  const { track } = info.getAsyncHelpers();
  track([
    someAsyncWork().catch(() => undefined),
    someOtherAsyncWork().catch(() => undefined)
  ]);

#### Type Parameters

##### T

`T`

#### Parameters

##### values

readonly (`T` \| `PromiseLike`\<`T`\>)[]

#### Returns

`Promise`\<`T`[]\>

***

### track

> `readonly` **track**: (`maybePromises`) => `void`

Defined in: [packages/utils/src/Interfaces.ts:104](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L104)

Tracks asynchronous work that should delay execution completion hooks.

#### Parameters

##### maybePromises

readonly `unknown`[]

#### Returns

`void`
