[graphql-tools-monorepo](../README) / [loaders/url/src](../modules/loaders_url_src) /
LoadFromUrlOptions

# Interface: LoadFromUrlOptions

[loaders/url/src](../modules/loaders_url_src).LoadFromUrlOptions

Additional options for loading from a URL

## Hierarchy

- [`BaseLoaderOptions`](../modules/utils_src#baseloaderoptions)

- `Partial`\<`IntrospectionOptions`>

- [`HTTPExecutorOptions`](executors_http_src.HTTPExecutorOptions)

  ↳ **`LoadFromUrlOptions`**

  ↳↳ [`PrismaLoaderOptions`](loaders_prisma_src.PrismaLoaderOptions)

## Table of contents

### Properties

- [File](loaders_url_src.LoadFromUrlOptions#file)
- [FormData](loaders_url_src.LoadFromUrlOptions#formdata)
- [allowLegacySDLEmptyFields](loaders_url_src.LoadFromUrlOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](loaders_url_src.LoadFromUrlOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](loaders_url_src.LoadFromUrlOptions#assumevalid)
- [assumeValidSDL](loaders_url_src.LoadFromUrlOptions#assumevalidsdl)
- [batch](loaders_url_src.LoadFromUrlOptions#batch)
- [commentDescriptions](loaders_url_src.LoadFromUrlOptions#commentdescriptions)
- [connectionParams](loaders_url_src.LoadFromUrlOptions#connectionparams)
- [credentials](loaders_url_src.LoadFromUrlOptions#credentials)
- [customFetch](loaders_url_src.LoadFromUrlOptions#customfetch)
- [cwd](loaders_url_src.LoadFromUrlOptions#cwd)
- [descriptions](loaders_url_src.LoadFromUrlOptions#descriptions)
- [directiveIsRepeatable](loaders_url_src.LoadFromUrlOptions#directiveisrepeatable)
- [endpoint](loaders_url_src.LoadFromUrlOptions#endpoint)
- [experimentalFragmentVariables](loaders_url_src.LoadFromUrlOptions#experimentalfragmentvariables)
- [fetch](loaders_url_src.LoadFromUrlOptions#fetch)
- [handleAsSDL](loaders_url_src.LoadFromUrlOptions#handleassdl)
- [headers](loaders_url_src.LoadFromUrlOptions#headers)
- [ignore](loaders_url_src.LoadFromUrlOptions#ignore)
- [includeSources](loaders_url_src.LoadFromUrlOptions#includesources)
- [inputValueDeprecation](loaders_url_src.LoadFromUrlOptions#inputvaluedeprecation)
- [method](loaders_url_src.LoadFromUrlOptions#method)
- [noLocation](loaders_url_src.LoadFromUrlOptions#nolocation)
- [retry](loaders_url_src.LoadFromUrlOptions#retry)
- [schemaDescription](loaders_url_src.LoadFromUrlOptions#schemadescription)
- [specifiedByUrl](loaders_url_src.LoadFromUrlOptions#specifiedbyurl)
- [subscriptionsEndpoint](loaders_url_src.LoadFromUrlOptions#subscriptionsendpoint)
- [subscriptionsProtocol](loaders_url_src.LoadFromUrlOptions#subscriptionsprotocol)
- [timeout](loaders_url_src.LoadFromUrlOptions#timeout)
- [useGETForQueries](loaders_url_src.LoadFromUrlOptions#usegetforqueries)
- [webSocketImpl](loaders_url_src.LoadFromUrlOptions#websocketimpl)

## Properties

### File

• `Optional` **File**: `Object`

#### Call signature

• **new File**(`fileBits`, `fileName`, `options?`): `File`

WHATWG compatible File implementation

##### Parameters

| Name       | Type              |
| :--------- | :---------------- |
| `fileBits` | `BlobPart`[]      |
| `fileName` | `string`          |
| `options?` | `FilePropertyBag` |

##### Returns

`File`

**`See`**

https://developer.mozilla.org/en-US/docs/Web/API/File

#### Type declaration

| Name        | Type   |
| :---------- | :----- |
| `prototype` | `File` |

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[File](executors_http_src.HTTPExecutorOptions#file)

#### Defined in

[packages/executors/http/src/index.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L76)

---

### FormData

• `Optional` **FormData**: `Object`

#### Call signature

• **new FormData**(`form?`, `submitter?`): `FormData`

WHATWG compatible FormData implementation

##### Parameters

| Name         | Type                    |
| :----------- | :---------------------- |
| `form?`      | `HTMLFormElement`       |
| `submitter?` | `null` \| `HTMLElement` |

##### Returns

`FormData`

**`See`**

https://developer.mozilla.org/en-US/docs/Web/API/FormData

#### Type declaration

| Name        | Type       |
| :---------- | :--------- |
| `prototype` | `FormData` |

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[FormData](executors_http_src.HTTPExecutorOptions#formdata)

#### Defined in

[packages/executors/http/src/index.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L81)

---

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Inherited from

BaseLoaderOptions.allowLegacySDLEmptyFields

#### Defined in

[packages/utils/src/Interfaces.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L95)

---

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Inherited from

BaseLoaderOptions.allowLegacySDLImplementsInterfaces

#### Defined in

[packages/utils/src/Interfaces.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L96)

---

### assumeValid

• `Optional` **assumeValid**: `boolean`

When building a schema from a GraphQL service's introspection result, it might be safe to assume the
schema is valid. Set to true to assume the produced schema is valid.

Default: false

#### Inherited from

BaseLoaderOptions.assumeValid

#### Defined in

node_modules/graphql/type/schema.d.ts:146

---

### assumeValidSDL

• `Optional` **assumeValidSDL**: `boolean`

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

BaseLoaderOptions.assumeValidSDL

#### Defined in

node_modules/graphql/utilities/buildASTSchema.d.ts:12

---

### batch

• `Optional` **batch**: `boolean`

Enable Batching

#### Defined in

[packages/loaders/url/src/index.ts:100](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L100)

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

BaseLoaderOptions.commentDescriptions

#### Defined in

[packages/utils/src/Interfaces.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L103)

---

### connectionParams

• `Optional` **connectionParams**: `Record`\<`string`, `unknown`> \| () => `Record`\<`string`,
`unknown`>

Connection Parameters for WebSockets connection

#### Defined in

[packages/loaders/url/src/index.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L96)

---

### credentials

• `Optional` **credentials**: `RequestCredentials`

Request Credentials (default: 'same-origin')

**`See`**

https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[credentials](executors_http_src.HTTPExecutorOptions#credentials)

#### Defined in

[packages/executors/http/src/index.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L67)

---

### customFetch

• `Optional` **customFetch**: `string` \| [`FetchFn`](../modules/executors_http_src#fetchfn)

A custom `fetch` implementation to use when querying the original schema. Defaults to `cross-fetch`

#### Defined in

[packages/loaders/url/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L71)

---

### cwd

• `Optional` **cwd**: `string`

#### Inherited from

BaseLoaderOptions.cwd

#### Defined in

[packages/utils/src/loaders.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L13)

---

### descriptions

• `Optional` **descriptions**: `boolean`

Whether to include descriptions in the introspection result. Default: true

#### Inherited from

Partial.descriptions

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:8

---

### directiveIsRepeatable

• `Optional` **directiveIsRepeatable**: `boolean`

Whether to include `isRepeatable` flag on directives. Default: false

#### Inherited from

Partial.directiveIsRepeatable

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:18

---

### endpoint

• `Optional` **endpoint**: `string`

Regular HTTP endpoint; defaults to the pointer

#### Overrides

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[endpoint](executors_http_src.HTTPExecutorOptions#endpoint)

#### Defined in

[packages/loaders/url/src/index.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L84)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

BaseLoaderOptions.experimentalFragmentVariables

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### fetch

• `Optional` **fetch**: [`FetchFn`](../modules/executors_http_src#fetchfn)

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[fetch](executors_http_src.HTTPExecutorOptions#fetch)

#### Defined in

[packages/executors/http/src/index.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L46)

---

### handleAsSDL

• `Optional` **handleAsSDL**: `boolean`

Handle URL as schema SDL

#### Defined in

[packages/loaders/url/src/index.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L80)

---

### headers

• `Optional` **headers**: [`HeadersConfig`](../modules/executors_http_src#headersconfig) \|
(`executorRequest?`: [`ExecutionRequest`](utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>) =>
[`HeadersConfig`](../modules/executors_http_src#headersconfig)

Additional headers to include when querying the original schema

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[headers](executors_http_src.HTTPExecutorOptions#headers)

#### Defined in

[packages/executors/http/src/index.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L54)

---

### ignore

• `Optional` **ignore**: `string` \| `string`[]

#### Inherited from

BaseLoaderOptions.ignore

#### Defined in

[packages/utils/src/loaders.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L14)

---

### includeSources

• `Optional` **includeSources**: `boolean`

#### Inherited from

BaseLoaderOptions.includeSources

#### Defined in

[packages/utils/src/loaders.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L15)

---

### inputValueDeprecation

• `Optional` **inputValueDeprecation**: `boolean`

Whether target GraphQL server support deprecation of input values. Default: false

#### Inherited from

Partial.inputValueDeprecation

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:28

---

### method

• `Optional` **method**: `"GET"` \| `"POST"`

HTTP method to use when querying the original schema.

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[method](executors_http_src.HTTPExecutorOptions#method)

#### Defined in

[packages/executors/http/src/index.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L58)

---

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

BaseLoaderOptions.noLocation

#### Defined in

[packages/utils/src/Interfaces.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L94)

---

### retry

• `Optional` **retry**: `number`

Retry attempts

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[retry](executors_http_src.HTTPExecutorOptions#retry)

#### Defined in

[packages/executors/http/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L71)

---

### schemaDescription

• `Optional` **schemaDescription**: `boolean`

Whether to include `description` field on schema. Default: false

#### Inherited from

Partial.schemaDescription

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:23

---

### specifiedByUrl

• `Optional` **specifiedByUrl**: `boolean`

Whether to include `specifiedByURL` in the introspection result. Default: false

#### Inherited from

Partial.specifiedByUrl

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:13

---

### subscriptionsEndpoint

• `Optional` **subscriptionsEndpoint**: `string`

Subscriptions endpoint; defaults to the endpoint given as HTTP endpoint

#### Defined in

[packages/loaders/url/src/index.ts:88](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L88)

---

### subscriptionsProtocol

• `Optional` **subscriptionsProtocol**:
[`SubscriptionProtocol`](/docs/api/enums/loaders_url_src.SubscriptionProtocol)

Use specific protocol for subscriptions

#### Defined in

[packages/loaders/url/src/index.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L92)

---

### timeout

• `Optional` **timeout**: `number`

Timeout in milliseconds

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[timeout](executors_http_src.HTTPExecutorOptions#timeout)

#### Defined in

[packages/executors/http/src/index.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L62)

---

### useGETForQueries

• `Optional` **useGETForQueries**: `boolean`

Whether to use the GET HTTP method for queries when querying the original schema

#### Inherited from

[HTTPExecutorOptions](executors_http_src.HTTPExecutorOptions).[useGETForQueries](executors_http_src.HTTPExecutorOptions#usegetforqueries)

#### Defined in

[packages/executors/http/src/index.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L50)

---

### webSocketImpl

• `Optional` **webSocketImpl**: `string` \| typeof `WebSocket`

Custom WebSocket implementation used by the loaded schema if subscriptions are enabled

#### Defined in

[packages/loaders/url/src/index.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L76)
