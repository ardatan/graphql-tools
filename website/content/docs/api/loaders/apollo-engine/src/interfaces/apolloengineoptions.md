---
title: "ApolloEngineOptions"
description: "The ApolloEngineOptions interface exported by @graphql-tools/apollo-engine-loader."
---

Defined in: [packages/loaders/apollo-engine/src/index.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L8)

Additional options for loading from Apollo Engine

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

### cwd?

> `optional` **cwd?**: `string`

Defined in: [packages/utils/src/loaders.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L13)

#### Inherited from

`BaseLoaderOptions.cwd`

***

### engine

> **engine**: `object`

Defined in: [packages/loaders/apollo-engine/src/index.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L9)

#### apiKey

> **apiKey**: `string`

#### endpoint?

> `optional` **endpoint?**: `string`

***

### experimentalFragmentVariables?

> `optional` **experimentalFragmentVariables?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L143)

#### Inherited from

`BaseLoaderOptions.experimentalFragmentVariables`

***

### graph

> **graph**: `string`

Defined in: [packages/loaders/apollo-engine/src/index.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L13)

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [packages/loaders/apollo-engine/src/index.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L15)

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

### variant

> **variant**: `string`

Defined in: [packages/loaders/apollo-engine/src/index.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L14)
