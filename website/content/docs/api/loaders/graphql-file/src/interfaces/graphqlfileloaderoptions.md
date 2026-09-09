---
title: "GraphQLFileLoaderOptions"
description: "The GraphQLFileLoaderOptions interface exported by @graphql-tools/graphql-file-loader."
---

Defined in: [packages/loaders/graphql-file/src/index.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L32)

Additional options for loading from a GraphQL file

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

### experimentalFragmentVariables?

> `optional` **experimentalFragmentVariables?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L143)

#### Inherited from

`BaseLoaderOptions.experimentalFragmentVariables`

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

### pathAliases?

> `optional` **pathAliases?**: [`PathAliases`](/docs/api/import/src/interfaces/pathaliases)

Defined in: [packages/loaders/graphql-file/src/index.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L41)

A series of entries which re-map imports to lookup locations.

***

### skipGraphQLImport?

> `optional` **skipGraphQLImport?**: `boolean`

Defined in: [packages/loaders/graphql-file/src/index.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L36)

Set to `true` to disable handling `#import` syntax
