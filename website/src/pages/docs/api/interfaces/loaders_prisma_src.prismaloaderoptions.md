[graphql-tools-monorepo](../README) / [loaders/prisma/src](../modules/loaders_prisma_src) /
PrismaLoaderOptions

# Interface: PrismaLoaderOptions

[loaders/prisma/src](../modules/loaders_prisma_src).PrismaLoaderOptions

additional options for loading from a `prisma.yml` file

## Hierarchy

- [`LoadFromUrlOptions`](loaders_url_src.LoadFromUrlOptions)

  ↳ **`PrismaLoaderOptions`**

## Table of contents

### Properties

- [File](loaders_prisma_src.PrismaLoaderOptions#file)
- [FormData](loaders_prisma_src.PrismaLoaderOptions#formdata)
- [allowLegacySDLEmptyFields](loaders_prisma_src.PrismaLoaderOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](loaders_prisma_src.PrismaLoaderOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](loaders_prisma_src.PrismaLoaderOptions#assumevalid)
- [assumeValidSDL](loaders_prisma_src.PrismaLoaderOptions#assumevalidsdl)
- [batch](loaders_prisma_src.PrismaLoaderOptions#batch)
- [commentDescriptions](loaders_prisma_src.PrismaLoaderOptions#commentdescriptions)
- [connectionParams](loaders_prisma_src.PrismaLoaderOptions#connectionparams)
- [credentials](loaders_prisma_src.PrismaLoaderOptions#credentials)
- [customFetch](loaders_prisma_src.PrismaLoaderOptions#customfetch)
- [cwd](loaders_prisma_src.PrismaLoaderOptions#cwd)
- [descriptions](loaders_prisma_src.PrismaLoaderOptions#descriptions)
- [directiveIsRepeatable](loaders_prisma_src.PrismaLoaderOptions#directiveisrepeatable)
- [endpoint](loaders_prisma_src.PrismaLoaderOptions#endpoint)
- [envVars](loaders_prisma_src.PrismaLoaderOptions#envvars)
- [experimentalFragmentVariables](loaders_prisma_src.PrismaLoaderOptions#experimentalfragmentvariables)
- [fetch](loaders_prisma_src.PrismaLoaderOptions#fetch)
- [graceful](loaders_prisma_src.PrismaLoaderOptions#graceful)
- [handleAsSDL](loaders_prisma_src.PrismaLoaderOptions#handleassdl)
- [headers](loaders_prisma_src.PrismaLoaderOptions#headers)
- [ignore](loaders_prisma_src.PrismaLoaderOptions#ignore)
- [includeSources](loaders_prisma_src.PrismaLoaderOptions#includesources)
- [inputValueDeprecation](loaders_prisma_src.PrismaLoaderOptions#inputvaluedeprecation)
- [method](loaders_prisma_src.PrismaLoaderOptions#method)
- [noLocation](loaders_prisma_src.PrismaLoaderOptions#nolocation)
- [retry](loaders_prisma_src.PrismaLoaderOptions#retry)
- [schemaDescription](loaders_prisma_src.PrismaLoaderOptions#schemadescription)
- [specifiedByUrl](loaders_prisma_src.PrismaLoaderOptions#specifiedbyurl)
- [subscriptionsEndpoint](loaders_prisma_src.PrismaLoaderOptions#subscriptionsendpoint)
- [subscriptionsProtocol](loaders_prisma_src.PrismaLoaderOptions#subscriptionsprotocol)
- [timeout](loaders_prisma_src.PrismaLoaderOptions#timeout)
- [useGETForQueries](loaders_prisma_src.PrismaLoaderOptions#usegetforqueries)
- [webSocketImpl](loaders_prisma_src.PrismaLoaderOptions#websocketimpl)

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

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[File](loaders_url_src.LoadFromUrlOptions#file)

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

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[FormData](loaders_url_src.LoadFromUrlOptions#formdata)

#### Defined in

[packages/executors/http/src/index.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L81)

---

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[allowLegacySDLEmptyFields](loaders_url_src.LoadFromUrlOptions#allowlegacysdlemptyfields)

#### Defined in

[packages/utils/src/Interfaces.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L95)

---

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[allowLegacySDLImplementsInterfaces](loaders_url_src.LoadFromUrlOptions#allowlegacysdlimplementsinterfaces)

#### Defined in

[packages/utils/src/Interfaces.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L96)

---

### assumeValid

• `Optional` **assumeValid**: `boolean`

When building a schema from a GraphQL service's introspection result, it might be safe to assume the
schema is valid. Set to true to assume the produced schema is valid.

Default: false

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[assumeValid](loaders_url_src.LoadFromUrlOptions#assumevalid)

#### Defined in

node_modules/graphql/type/schema.d.ts:146

---

### assumeValidSDL

• `Optional` **assumeValidSDL**: `boolean`

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[assumeValidSDL](loaders_url_src.LoadFromUrlOptions#assumevalidsdl)

#### Defined in

node_modules/graphql/utilities/buildASTSchema.d.ts:12

---

### batch

• `Optional` **batch**: `boolean`

Enable Batching

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[batch](loaders_url_src.LoadFromUrlOptions#batch)

#### Defined in

[packages/loaders/url/src/index.ts:100](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L100)

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[commentDescriptions](loaders_url_src.LoadFromUrlOptions#commentdescriptions)

#### Defined in

[packages/utils/src/Interfaces.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L103)

---

### connectionParams

• `Optional` **connectionParams**: `Record`\<`string`, `unknown`> \| () => `Record`\<`string`,
`unknown`>

Connection Parameters for WebSockets connection

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[connectionParams](loaders_url_src.LoadFromUrlOptions#connectionparams)

#### Defined in

[packages/loaders/url/src/index.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L96)

---

### credentials

• `Optional` **credentials**: `RequestCredentials`

Request Credentials (default: 'same-origin')

**`See`**

https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[credentials](loaders_url_src.LoadFromUrlOptions#credentials)

#### Defined in

[packages/executors/http/src/index.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L67)

---

### customFetch

• `Optional` **customFetch**: `string` \| [`FetchFn`](../modules/executors_http_src#fetchfn)

A custom `fetch` implementation to use when querying the original schema. Defaults to `cross-fetch`

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[customFetch](loaders_url_src.LoadFromUrlOptions#customfetch)

#### Defined in

[packages/loaders/url/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L71)

---

### cwd

• `Optional` **cwd**: `string`

#### Overrides

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[cwd](loaders_url_src.LoadFromUrlOptions#cwd)

#### Defined in

[packages/loaders/prisma/src/index.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L16)

---

### descriptions

• `Optional` **descriptions**: `boolean`

Whether to include descriptions in the introspection result. Default: true

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[descriptions](loaders_url_src.LoadFromUrlOptions#descriptions)

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:8

---

### directiveIsRepeatable

• `Optional` **directiveIsRepeatable**: `boolean`

Whether to include `isRepeatable` flag on directives. Default: false

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[directiveIsRepeatable](loaders_url_src.LoadFromUrlOptions#directiveisrepeatable)

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:18

---

### endpoint

• `Optional` **endpoint**: `string`

Regular HTTP endpoint; defaults to the pointer

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[endpoint](loaders_url_src.LoadFromUrlOptions#endpoint)

#### Defined in

[packages/loaders/url/src/index.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L84)

---

### envVars

• `Optional` **envVars**: `Object`

#### Index signature

▪ [key: `string`]: `string`

#### Defined in

[packages/loaders/prisma/src/index.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L14)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[experimentalFragmentVariables](loaders_url_src.LoadFromUrlOptions#experimentalfragmentvariables)

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### fetch

• `Optional` **fetch**: [`FetchFn`](../modules/executors_http_src#fetchfn)

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[fetch](loaders_url_src.LoadFromUrlOptions#fetch)

#### Defined in

[packages/executors/http/src/index.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L46)

---

### graceful

• `Optional` **graceful**: `boolean`

#### Defined in

[packages/loaders/prisma/src/index.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L15)

---

### handleAsSDL

• `Optional` **handleAsSDL**: `boolean`

Handle URL as schema SDL

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[handleAsSDL](loaders_url_src.LoadFromUrlOptions#handleassdl)

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

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[headers](loaders_url_src.LoadFromUrlOptions#headers)

#### Defined in

[packages/executors/http/src/index.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L54)

---

### ignore

• `Optional` **ignore**: `string` \| `string`[]

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[ignore](loaders_url_src.LoadFromUrlOptions#ignore)

#### Defined in

[packages/utils/src/loaders.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L14)

---

### includeSources

• `Optional` **includeSources**: `boolean`

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[includeSources](loaders_url_src.LoadFromUrlOptions#includesources)

#### Defined in

[packages/utils/src/loaders.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L15)

---

### inputValueDeprecation

• `Optional` **inputValueDeprecation**: `boolean`

Whether target GraphQL server support deprecation of input values. Default: false

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[inputValueDeprecation](loaders_url_src.LoadFromUrlOptions#inputvaluedeprecation)

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:28

---

### method

• `Optional` **method**: `"GET"` \| `"POST"`

HTTP method to use when querying the original schema.

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[method](loaders_url_src.LoadFromUrlOptions#method)

#### Defined in

[packages/executors/http/src/index.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L58)

---

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[noLocation](loaders_url_src.LoadFromUrlOptions#nolocation)

#### Defined in

[packages/utils/src/Interfaces.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L94)

---

### retry

• `Optional` **retry**: `number`

Retry attempts

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[retry](loaders_url_src.LoadFromUrlOptions#retry)

#### Defined in

[packages/executors/http/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L71)

---

### schemaDescription

• `Optional` **schemaDescription**: `boolean`

Whether to include `description` field on schema. Default: false

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[schemaDescription](loaders_url_src.LoadFromUrlOptions#schemadescription)

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:23

---

### specifiedByUrl

• `Optional` **specifiedByUrl**: `boolean`

Whether to include `specifiedByURL` in the introspection result. Default: false

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[specifiedByUrl](loaders_url_src.LoadFromUrlOptions#specifiedbyurl)

#### Defined in

node_modules/graphql/utilities/getIntrospectionQuery.d.ts:13

---

### subscriptionsEndpoint

• `Optional` **subscriptionsEndpoint**: `string`

Subscriptions endpoint; defaults to the endpoint given as HTTP endpoint

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[subscriptionsEndpoint](loaders_url_src.LoadFromUrlOptions#subscriptionsendpoint)

#### Defined in

[packages/loaders/url/src/index.ts:88](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L88)

---

### subscriptionsProtocol

• `Optional` **subscriptionsProtocol**:
[`SubscriptionProtocol`](/docs/api/enums/loaders_url_src.SubscriptionProtocol)

Use specific protocol for subscriptions

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[subscriptionsProtocol](loaders_url_src.LoadFromUrlOptions#subscriptionsprotocol)

#### Defined in

[packages/loaders/url/src/index.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L92)

---

### timeout

• `Optional` **timeout**: `number`

Timeout in milliseconds

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[timeout](loaders_url_src.LoadFromUrlOptions#timeout)

#### Defined in

[packages/executors/http/src/index.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L62)

---

### useGETForQueries

• `Optional` **useGETForQueries**: `boolean`

Whether to use the GET HTTP method for queries when querying the original schema

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[useGETForQueries](loaders_url_src.LoadFromUrlOptions#usegetforqueries)

#### Defined in

[packages/executors/http/src/index.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L50)

---

### webSocketImpl

• `Optional` **webSocketImpl**: `string` \| typeof `WebSocket`

Custom WebSocket implementation used by the loaded schema if subscriptions are enabled

#### Inherited from

[LoadFromUrlOptions](loaders_url_src.LoadFromUrlOptions).[webSocketImpl](loaders_url_src.LoadFromUrlOptions#websocketimpl)

#### Defined in

[packages/loaders/url/src/index.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L76)
