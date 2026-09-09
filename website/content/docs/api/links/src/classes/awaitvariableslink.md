---
title: "AwaitVariablesLink"
description: "The AwaitVariablesLink class exported by @graphql-tools/links."
---

Defined in: [packages/links/src/AwaitVariablesLink.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/links/src/AwaitVariablesLink.ts#L40)

## Extends

- `ApolloLink`

## Constructors

### Constructor

> **new AwaitVariablesLink**(`request?`): `AwaitVariablesLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:296

#### Parameters

##### request?

`RequestHandler`

#### Returns

`AwaitVariablesLink`

#### Inherited from

`apollo.ApolloLink.constructor`

## Properties

### ~~getMemoryInternals?~~

> `optional` **getMemoryInternals?**: () => `unknown`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:382

**`Internal`**

Can be provided by a link that has an internal cache to report it's memory details.

#### Returns

`unknown`

#### Deprecated

This is an internal API and should not be used directly. This can be removed or changed at any time.

#### Inherited from

`apollo.ApolloLink.getMemoryInternals`

***

### ~~left?~~

> `readonly` `optional` **left?**: `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:368

**`Internal`**

Used to iterate through all links that are concatenations or `split` links.

#### Deprecated

This is an internal API and should not be used directly. This can be removed or changed at any time.

#### Inherited from

`apollo.ApolloLink.left`

***

### ~~right?~~

> `readonly` `optional` **right?**: `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:375

**`Internal`**

Used to iterate through all links that are concatenations or `split` links.

#### Deprecated

This is an internal API and should not be used directly. This can be removed or changed at any time.

#### Inherited from

`apollo.ApolloLink.right`

## Methods

### concat()

> **concat**(...`links`): `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:351

Combines the link with other links into a single composed link.

#### Parameters

##### links

...`ApolloLink`[]

#### Returns

`ApolloLink`

#### Example

```ts
import { ApolloLink, HttpLink } from "@apollo/client";

const previousLink = new ApolloLink((operation, forward) => {
  // Handle the request

  return forward(operation);
});

const link = previousLink.concat(
  link1,
  link2,
  new HttpLink({ uri: "http://localhost:4000/graphql" })
);
```

#### Inherited from

`apollo.ApolloLink.concat`

***

### request()

> **request**(`operation`, `forward`): `Observable`\<`FormattedExecutionResult`\<`Record`\<`string`, `any`\>, `Record`\<`string`, `any`\>\>\>

Defined in: [packages/links/src/AwaitVariablesLink.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/links/src/AwaitVariablesLink.ts#L41)

Runs the request handler for the provided operation.

> [!NOTE]
> This is called by the `ApolloLink.execute` function for you and should
> not be called directly. Prefer using `ApolloLink.execute` to make the
> request instead.

#### Parameters

##### operation

`Operation`

##### forward

`ForwardFunction`

#### Returns

`Observable`\<`FormattedExecutionResult`\<`Record`\<`string`, `any`\>, `Record`\<`string`, `any`\>\>\>

#### Overrides

`apollo.ApolloLink.request`

***

### split()

> **split**(`test`, `left`, `right?`): `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:329

Concatenates a link that conditionally routes a request to different links.

#### Parameters

##### test

(`op`) => `boolean`

A predicate function that receives the current `operation`
and returns a boolean indicating which link to execute. Returning `true`
executes the `left` link. Returning `false` executes the `right` link.

##### left

`ApolloLink`

The link that executes when the `test` function returns
`true`.

##### right?

`ApolloLink`

The link that executes when the `test` function returns
`false`. If the `right` link is not provided, the request is forwarded to
the next link in the chain.

#### Returns

`ApolloLink`

#### Example

```ts
import { ApolloLink, HttpLink } from "@apollo/client";

const previousLink = new ApolloLink((operation, forward) => {
  // Handle the request

  return forward(operation);
});

const link = previousLink.split(
  (operation) => operation.getContext().version === 1,
  new HttpLink({ uri: "http://localhost:4000/v1/graphql" }),
  new HttpLink({ uri: "http://localhost:4000/v2/graphql" })
);
```

#### Inherited from

`apollo.ApolloLink.split`

***

### ~~concat()~~

> `static` **concat**(...`links`): `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:295

Combines multiple links into a single composed link.

#### Parameters

##### links

...`ApolloLink`[]

The links to concatenate into a single link. Each link will
execute in serial order.

#### Returns

`ApolloLink`

#### Example

```ts
const link = ApolloLink.concat(firstLink, secondLink, thirdLink);
```

#### Deprecated

Use `ApolloLink.from` instead. `ApolloLink.concat` will be
removed in a future major version.

#### Inherited from

`apollo.ApolloLink.concat`

***

### empty()

> `static` **empty**(): `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:199

Creates a link that completes immediately and does not emit a result.

#### Returns

`ApolloLink`

#### Example

```ts
const link = ApolloLink.empty();
```

#### Inherited from

`apollo.ApolloLink.empty`

***

### execute()

> `static` **execute**(`link`, `request`, `context`): `Observable`\<`FormattedExecutionResult`\<`Record`\<`string`, `any`\>, `Record`\<`string`, `any`\>\>\>

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:279

Executes a GraphQL request against a link. The `execute` function begins
the request by calling the request handler of the link.

#### Parameters

##### link

`ApolloLink`

The `ApolloLink` instance to execute the request.

##### request

`Request`

The GraphQL request details, such as the `query` and
`variables`.

##### context

`ExecuteContext`

The execution context for the request, such as the
`client` making the request.

#### Returns

`Observable`\<`FormattedExecutionResult`\<`Record`\<`string`, `any`\>, `Record`\<`string`, `any`\>\>\>

#### Example

```ts
const observable = ApolloLink.execute(link, { query, variables }, { client });

observable.subscribe({
  next(value) {
    console.log("Received", value);
  },
  error(error) {
    console.error("Oops got error", error);
  },
  complete() {
    console.log("Request complete");
  },
});
```

#### Inherited from

`apollo.ApolloLink.execute`

***

### from()

> `static` **from**(`links`): `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:221

Composes multiple links into a single composed link that executes each
provided link in serial order.

#### Parameters

##### links

`ApolloLink`[]

An array of `ApolloLink` instances or request handlers that
are executed in serial order.

#### Returns

`ApolloLink`

#### Example

```ts
import { from, HttpLink, ApolloLink } from "@apollo/client";
import { RetryLink } from "@apollo/client/link/retry";
import MyAuthLink from "../auth";

const link = ApolloLink.from([
  new RetryLink(),
  new MyAuthLink(),
  new HttpLink({ uri: "http://localhost:4000/graphql" }),
]);
```

#### Inherited from

`apollo.ApolloLink.from`

***

### split()

> `static` **split**(`test`, `left`, `right?`): `ApolloLink`

Defined in: node\_modules/@apollo/client/link/core/ApolloLink.d.ts:248

Creates a link that conditionally routes a request to different links.

#### Parameters

##### test

(`op`) => `boolean`

A predicate function that receives the current `operation`
and returns a boolean indicating which link to execute. Returning `true`
executes the `left` link. Returning `false` executes the `right` link.

##### left

`ApolloLink`

The link that executes when the `test` function returns
`true`.

##### right?

`ApolloLink`

The link that executes when the `test` function returns
`false`. If the `right` link is not provided, the request is forwarded to
the next link in the chain.

#### Returns

`ApolloLink`

#### Example

```ts
import { ApolloLink, HttpLink } from "@apollo/client";

const link = ApolloLink.split(
  (operation) => operation.getContext().version === 1,
  new HttpLink({ uri: "http://localhost:4000/v1/graphql" }),
  new HttpLink({ uri: "http://localhost:4000/v2/graphql" })
);
```

#### Inherited from

`apollo.ApolloLink.split`
