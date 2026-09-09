---
title: "GithubLoaderOptions"
description: "The GithubLoaderOptions interface exported by @graphql-tools/github-loader."
---

Defined in: [packages/loaders/github/src/index.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L41)

Additional options for loading from GitHub

## Extends

- [`BaseLoaderOptions`](/docs/api/utils/src/type-aliases/baseloaderoptions)

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

### commentDescriptions?

> `optional` **commentDescriptions?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:149](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L149)

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

`BaseLoaderOptions.commentDescriptions`

***

### customFetch?

> `optional` **customFetch?**: [`FetchFn`](/docs/api/loaders/url/src/type-aliases/fetchfn)

Defined in: [packages/loaders/github/src/index.ts:52](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L52)

***

### cwd?

> `optional` **cwd?**: `string`

Defined in: [packages/utils/src/loaders.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L13)

#### Inherited from

`BaseLoaderOptions.cwd`

***

### experimentalFragmentVariables?

> `optional` **experimentalFragmentVariables?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L143)

#### Inherited from

`BaseLoaderOptions.experimentalFragmentVariables`

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [packages/loaders/github/src/index.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L56)

Additional headers to pass to the fetch request

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

### noLocation?

> `optional` **noLocation?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L140)

#### Inherited from

`BaseLoaderOptions.noLocation`

***

### pluckConfig?

> `optional` **pluckConfig?**: [`GraphQLTagPluckOptions`](/docs/api/graphql-tag-pluck/src/interfaces/graphqltagpluckoptions)

Defined in: [packages/loaders/github/src/index.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L51)

Additional options to pass to `graphql-tag-pluck`

***

### token?

> `optional` **token?**: `string`

Defined in: [packages/loaders/github/src/index.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L47)

A GitHub access token

#### Default

```ts
process.env.GITHUB_TOKEN
```
