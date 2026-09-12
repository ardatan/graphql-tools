---
title: "LoadFromUrlOptions"
description: "The LoadFromUrlOptions interface exported by @graphql-tools/url-loader."
---

Defined in: [packages/loaders/url/src/index.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L66)

Additional options for loading from a URL

## Extends

- [`BaseLoaderOptions`](/docs/api/utils/src/type-aliases/baseloaderoptions).`Partial`\<`IntrospectionOptions`\>.`HTTPExecutorOptions`

## Properties

### allowLegacySDLEmptyFields?

> `optional` **allowLegacySDLEmptyFields?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:141](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L141)

#### Inherited from

`BaseLoaderOptions.allowLegacySDLEmptyFields`

***

### allowLegacySDLImplementsInterfaces?

> `optional` **allowLegacySDLImplementsInterfaces?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:142](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L142)

#### Inherited from

`BaseLoaderOptions.allowLegacySDLImplementsInterfaces`

***

### apq?

> `optional` **apq?**: `boolean`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:89

Enable Automatic Persisted Queries

#### See

https://www.apollographql.com/docs/apollo-server/performance/apq/

#### Inherited from

`HTTPExecutorOptions.apq`

***

### assumeValid?

> `optional` **assumeValid?**: `boolean`

Defined in: node\_modules/graphql/type/schema.d.mts:612

**`Internal`**

When building a schema from a GraphQL service's introspection result, it
might be safe to assume the schema is valid. Set to true to assume the
produced schema is valid.

Default: false

#### Inherited from

`BaseLoaderOptions.assumeValid`

***

### assumeValidSDL?

> `optional` **assumeValidSDL?**: `boolean`

Defined in: node\_modules/graphql/utilities/buildASTSchema.d.mts:14

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

`BaseLoaderOptions.assumeValidSDL`

***

### batch?

> `optional` **batch?**: `boolean`

Defined in: [packages/loaders/url/src/index.ts:106](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L106)

Enable Batching

***

### commentDescriptions?

> `optional` **commentDescriptions?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:149](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L149)

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

`BaseLoaderOptions.commentDescriptions`

***

### connectionParams?

> `optional` **connectionParams?**: `Record`\<`string`, `unknown`\> \| (() => `Record`\<`string`, `unknown`\>)

Defined in: [packages/loaders/url/src/index.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L97)

Connection Parameters for WebSockets connection

***

### credentials?

> `optional` **credentials?**: `RequestCredentials`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:65

Request Credentials

#### Default

```ts
'same-origin'
```

#### See

https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials

#### Inherited from

`HTTPExecutorOptions.credentials`

***

### customFetch?

> `optional` **customFetch?**: `string` \| [`FetchFn`](/docs/api/loaders/url/src/type-aliases/fetchfn)

Defined in: [packages/loaders/url/src/index.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L72)

A custom `fetch` implementation to use when querying the original schema.
Defaults to `cross-fetch`

***

### cwd?

> `optional` **cwd?**: `string`

Defined in: [packages/utils/src/loaders.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L13)

#### Inherited from

`BaseLoaderOptions.cwd`

***

### deduplicateInflightRequests?

> `optional` **deduplicateInflightRequests?**: `boolean`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:106

Whether to deduplicate inflight requests with the same parameters.
This can be useful to avoid making multiple identical requests to the upstream service when
multiple parts of the gateway are requesting the same data at the same time.

#### Default

```ts
true
```

#### Inherited from

`HTTPExecutorOptions.deduplicateInflightRequests`

***

### descriptions?

> `optional` **descriptions?**: `boolean`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:11

Whether to include descriptions in the introspection result.
Default: true

#### Inherited from

`Partial.descriptions`

***

### directiveIsRepeatable?

> `optional` **directiveIsRepeatable?**: `boolean`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:21

Whether to include `isRepeatable` flag on directives.
Default: false

#### Inherited from

`Partial.directiveIsRepeatable`

***

### ~~disposable?~~

> `optional` **disposable?**: `boolean`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:95

Enable Explicit Resource Management

#### See

https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management

#### Deprecated

The executors are always disposable, and this option will be removed in the next major version, there is no need to have a flag for this.

#### Inherited from

`HTTPExecutorOptions.disposable`

***

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [packages/loaders/url/src/index.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L85)

Regular HTTP endpoint; defaults to the pointer

#### Overrides

`HTTPExecutorOptions.endpoint`

***

### experimentalDirectiveDeprecation?

> `optional` **experimentalDirectiveDeprecation?**: `boolean`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:36

Whether target GraphQL server supports deprecation of directives.
Default: false

#### Inherited from

`Partial.experimentalDirectiveDeprecation`

***

### experimentalFragmentVariables?

> `optional` **experimentalFragmentVariables?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L143)

#### Inherited from

`BaseLoaderOptions.experimentalFragmentVariables`

***

### exposeHTTPDetailsInExtensions?

> `optional` **exposeHTTPDetailsInExtensions?**: `boolean`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:114

This option allows you to include the response detauls in the result extensions when a request fails.
This can be useful for debugging and error handling purposes, as it provides additional context about the response that led to the error.
However, be cautious when enabling this option, as response headers may contain sensitive information.

#### Default

```ts
false
```

#### Inherited from

`HTTPExecutorOptions.exposeHTTPDetailsInExtensions`

***

### fetch?

> `optional` **fetch?**: [`FetchFn`](/docs/api/loaders/url/src/type-aliases/fetchfn)

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:29

The WHATWG compatible fetch implementation to use

#### See

https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

#### Default

```ts
globalThis.fetch
```

#### Inherited from

`HTTPExecutorOptions.fetch`

***

### File?

> `optional` **File?**: \{(`fileBits`, `fileName`, `options?`): `File`; `prototype`: `File`; \}

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:74

WHATWG compatible `File` implementation

#### Parameters

##### fileBits

`BlobPart`[]

##### fileName

`string`

##### options?

`FilePropertyBag`

#### Returns

`File`

#### prototype

> **prototype**: `File`

#### See

https://developer.mozilla.org/en-US/docs/Web/API/File

#### Inherited from

`HTTPExecutorOptions.File`

***

### FormData?

> `optional` **FormData?**: \{(`form?`, `submitter?`): `FormData`; `prototype`: `FormData`; \}

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:79

WHATWG compatible `FormData` implementation

#### Parameters

##### form?

`HTMLFormElement`

##### submitter?

`HTMLElement` \| `null`

#### Returns

`FormData`

#### prototype

> **prototype**: `FormData`

#### See

https://developer.mozilla.org/en-US/docs/Web/API/FormData

#### Inherited from

`HTTPExecutorOptions.FormData`

***

### handleAsSDL?

> `optional` **handleAsSDL?**: `boolean`

Defined in: [packages/loaders/url/src/index.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L81)

Handle URL as schema SDL

***

### headers?

> `optional` **headers?**: `HeadersConfig` \| ((`executorRequest?`) => `HeadersConfig`)

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:50

Additional headers to include when querying the original schema

#### Inherited from

`HTTPExecutorOptions.headers`

***

### ignore?

> `optional` **ignore?**: `string` \| `string`[]

Defined in: [packages/utils/src/loaders.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L14)

#### Inherited from

`BaseLoaderOptions.ignore`

***

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [packages/utils/src/loaders.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L15)

#### Inherited from

`BaseLoaderOptions.includeSources`

***

### inputValueDeprecation?

> `optional` **inputValueDeprecation?**: `boolean`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:31

Whether target GraphQL server support deprecation of input values.
Default: false

#### Inherited from

`Partial.inputValueDeprecation`

***

### method?

> `optional` **method?**: `"GET"` \| `"POST"`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:55

HTTP method to use when querying the original schema.x

#### Default

```ts
'POST'
```

#### Inherited from

`HTTPExecutorOptions.method`

***

### noLocation?

> `optional` **noLocation?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L140)

#### Inherited from

`BaseLoaderOptions.noLocation`

***

### oneOf?

> `optional` **oneOf?**: `boolean`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:41

Whether target GraphQL server supports `@oneOf` input objects.
Default: false

#### Inherited from

`Partial.oneOf`

***

### print?

> `optional` **print?**: (`doc`) => `string`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:84

Print function for `DocumentNode`
Useful when you want to memoize the print function or use a different implementation to minify the query etc.

#### Parameters

##### doc

`DocumentNode`

#### Returns

`string`

#### Inherited from

`HTTPExecutorOptions.print`

***

### rejectUnauthorized?

> `optional` **rejectUnauthorized?**: `boolean`

Defined in: [packages/loaders/url/src/index.ts:102](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L102)

Whether to reject unauthorized TLS certificates for legacy `wss://` subscriptions.
Defaults to `true`. Only applies when `subscriptionsProtocol` is `LEGACY_WS`.

***

### retry?

> `optional` **retry?**: `number`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:69

Retry attempts

#### Inherited from

`HTTPExecutorOptions.retry`

***

### schemaDescription?

> `optional` **schemaDescription?**: `boolean`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:26

Whether to include `description` field on schema.
Default: false

#### Inherited from

`Partial.schemaDescription`

***

### specifiedByUrl?

> `optional` **specifiedByUrl?**: `boolean`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:16

Whether to include `specifiedByURL` in the introspection result.
Default: false

#### Inherited from

`Partial.specifiedByUrl`

***

### subscriptionsEndpoint?

> `optional` **subscriptionsEndpoint?**: `string`

Defined in: [packages/loaders/url/src/index.ts:89](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L89)

Subscriptions endpoint; defaults to the endpoint given as HTTP endpoint

***

### subscriptionsProtocol?

> `optional` **subscriptionsProtocol?**: [`SubscriptionProtocol`](/docs/api/loaders/url/src/enumerations/subscriptionprotocol)

Defined in: [packages/loaders/url/src/index.ts:93](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L93)

Use specific protocol for subscriptions

***

### timeout?

> `optional` **timeout?**: `number` \| ((`request`) => `number` \| `undefined`)

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:59

Timeout in milliseconds

#### Inherited from

`HTTPExecutorOptions.timeout`

***

### typeDepth?

> `optional` **typeDepth?**: `number`

Defined in: node\_modules/graphql/utilities/getIntrospectionQuery.d.mts:50

How deep to recurse into nested types, larger values will result in more
accurate results, but have a higher load on the server.
Some servers might restrict the maximum query depth or complexity.
If that's the case, try decreasing this value.

Default: 9

#### Inherited from

`Partial.typeDepth`

***

### useContentTypeForGETRequests?

> `optional` **useContentTypeForGETRequests?**: `boolean`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:46

Whether to set `content-type: application/json` on GET requests when one isn't already provided.
This can be useful for compatibility with servers that require a preflighted GET request.

#### Default

```ts
false
```

#### Inherited from

`HTTPExecutorOptions.useContentTypeForGETRequests`

***

### useGETForHashedQueries?

> `optional` **useGETForHashedQueries?**: `boolean`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:40

Whether to use the GET HTTP method for hashed Automatic Persisted Query requests.
Full query fallbacks and mutations continue to use POST.

#### Default

```ts
false
```

#### Inherited from

`HTTPExecutorOptions.useGETForHashedQueries`

***

### useGETForQueries?

> `optional` **useGETForQueries?**: `boolean`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:34

Whether to use the GET HTTP method for queries when querying the original schema

#### Default

```ts
false
```

#### Inherited from

`HTTPExecutorOptions.useGETForQueries`

***

### webSocketImpl?

> `optional` **webSocketImpl?**: `string` \| *typeof* `WebSocket`

Defined in: [packages/loaders/url/src/index.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L77)

Custom WebSocket implementation used by the loaded schema if subscriptions
are enabled

## Methods

### getDisposeReason()?

> `optional` **getDisposeReason**(): `Error` \| `undefined`

Defined in: node\_modules/@graphql-tools/executor-http/dist/index.d.ts:99

On dispose abort error

#### Returns

`Error` \| `undefined`

#### Inherited from

`HTTPExecutorOptions.getDisposeReason`
