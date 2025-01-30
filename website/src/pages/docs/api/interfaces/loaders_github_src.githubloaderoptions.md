[graphql-tools-monorepo](../README) / [loaders/github/src](../modules/loaders_github_src) /
GithubLoaderOptions

# Interface: GithubLoaderOptions

[loaders/github/src](../modules/loaders_github_src).GithubLoaderOptions

Additional options for loading from GitHub

## Hierarchy

- [`BaseLoaderOptions`](../modules/utils_src#baseloaderoptions)

  ↳ **`GithubLoaderOptions`**

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](loaders_github_src.GithubLoaderOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](loaders_github_src.GithubLoaderOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](loaders_github_src.GithubLoaderOptions#assumevalid)
- [assumeValidSDL](loaders_github_src.GithubLoaderOptions#assumevalidsdl)
- [commentDescriptions](loaders_github_src.GithubLoaderOptions#commentdescriptions)
- [customFetch](loaders_github_src.GithubLoaderOptions#customfetch)
- [cwd](loaders_github_src.GithubLoaderOptions#cwd)
- [experimentalFragmentVariables](loaders_github_src.GithubLoaderOptions#experimentalfragmentvariables)
- [headers](loaders_github_src.GithubLoaderOptions#headers)
- [ignore](loaders_github_src.GithubLoaderOptions#ignore)
- [includeSources](loaders_github_src.GithubLoaderOptions#includesources)
- [noLocation](loaders_github_src.GithubLoaderOptions#nolocation)
- [pluckConfig](loaders_github_src.GithubLoaderOptions#pluckconfig)
- [token](loaders_github_src.GithubLoaderOptions#token)

## Properties

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

### customFetch

• `Optional` **customFetch**: [`FetchFn`](../modules/executors_http_src#fetchfn)

#### Defined in

[packages/loaders/github/src/index.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L51)

---

### cwd

• `Optional` **cwd**: `string`

#### Inherited from

BaseLoaderOptions.cwd

#### Defined in

[packages/utils/src/loaders.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L13)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

BaseLoaderOptions.experimentalFragmentVariables

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### headers

• `Optional` **headers**: `Record`\<`string`, `string`>

Additional headers to pass to the fetch request

#### Defined in

[packages/loaders/github/src/index.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L55)

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

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

BaseLoaderOptions.noLocation

#### Defined in

[packages/utils/src/Interfaces.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L94)

---

### pluckConfig

• `Optional` **pluckConfig**:
[`GraphQLTagPluckOptions`](graphql_tag_pluck_src.GraphQLTagPluckOptions)

Additional options to pass to `graphql-tag-pluck`

#### Defined in

[packages/loaders/github/src/index.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L50)

---

### token

• `Optional` **token**: `string`

A GitHub access token

**`Default`**

```ts
process.env.GITHUB_TOKEN
```

#### Defined in

[packages/loaders/github/src/index.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L46)
