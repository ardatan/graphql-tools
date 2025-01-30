[graphql-tools-monorepo](../README) / [executors/http/src](../modules/executors_http_src) /
HTTPExecutorOptions

# Interface: HTTPExecutorOptions

[executors/http/src](../modules/executors_http_src).HTTPExecutorOptions

## Hierarchy

- **`HTTPExecutorOptions`**

  ↳ [`LoadFromUrlOptions`](loaders_url_src.LoadFromUrlOptions)

## Table of contents

### Properties

- [File](executors_http_src.HTTPExecutorOptions#file)
- [FormData](executors_http_src.HTTPExecutorOptions#formdata)
- [credentials](executors_http_src.HTTPExecutorOptions#credentials)
- [endpoint](executors_http_src.HTTPExecutorOptions#endpoint)
- [fetch](executors_http_src.HTTPExecutorOptions#fetch)
- [headers](executors_http_src.HTTPExecutorOptions#headers)
- [method](executors_http_src.HTTPExecutorOptions#method)
- [retry](executors_http_src.HTTPExecutorOptions#retry)
- [timeout](executors_http_src.HTTPExecutorOptions#timeout)
- [useGETForQueries](executors_http_src.HTTPExecutorOptions#usegetforqueries)

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

#### Defined in

[packages/executors/http/src/index.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L81)

---

### credentials

• `Optional` **credentials**: `RequestCredentials`

Request Credentials (default: 'same-origin')

**`See`**

https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials

#### Defined in

[packages/executors/http/src/index.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L67)

---

### endpoint

• `Optional` **endpoint**: `string`

#### Defined in

[packages/executors/http/src/index.ts:45](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L45)

---

### fetch

• `Optional` **fetch**: [`FetchFn`](../modules/executors_http_src#fetchfn)

#### Defined in

[packages/executors/http/src/index.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L46)

---

### headers

• `Optional` **headers**: [`HeadersConfig`](../modules/executors_http_src#headersconfig) \|
(`executorRequest?`: [`ExecutionRequest`](utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>) =>
[`HeadersConfig`](../modules/executors_http_src#headersconfig)

Additional headers to include when querying the original schema

#### Defined in

[packages/executors/http/src/index.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L54)

---

### method

• `Optional` **method**: `"GET"` \| `"POST"`

HTTP method to use when querying the original schema.

#### Defined in

[packages/executors/http/src/index.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L58)

---

### retry

• `Optional` **retry**: `number`

Retry attempts

#### Defined in

[packages/executors/http/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L71)

---

### timeout

• `Optional` **timeout**: `number`

Timeout in milliseconds

#### Defined in

[packages/executors/http/src/index.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L62)

---

### useGETForQueries

• `Optional` **useGETForQueries**: `boolean`

Whether to use the GET HTTP method for queries when querying the original schema

#### Defined in

[packages/executors/http/src/index.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L50)
