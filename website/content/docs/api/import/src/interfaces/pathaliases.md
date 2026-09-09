---
title: "PathAliases"
description: "The PathAliases interface exported by @graphql-tools/import."
---

Defined in: [packages/import/src/index.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L73)

Configuration for path aliasing in GraphQL import statements using the same
syntax as tsconfig.json#paths

## Properties

### mappings

> **mappings**: `Record`\<`string`, `string`\>

Defined in: [packages/import/src/index.ts:131](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L131)

A map of path aliases to their corresponding file system paths. Keys are
the aliases used in import statements, values are the paths they resolve
to.

## Supports two patterns:

1. Exact mapping: Maps a specific alias to a specific file
   `'@user': '/path/to/user.graphql'`

2. Wildcard mapping: Maps a prefix pattern to a directory pattern using '*'
   2a. The '*' is replaced with the remainder of the import path
       `'@models/*': '/path/to/models/*'`
   2b. Maps to a directory without wildcard expansion
       `'@types/*': '/path/to/types'`

#### Example

```ts
{
  mappings: {
    // Exact mapping
    '@schema': '/project/schema/main.graphql',

    // Wildcard mapping with expansion
    '@models/*': '/project/graphql/models/*',

    // Wildcard mapping without expansion
    '@types/*': '/project/graphql/types.graphql',

    // Relative paths (resolved against rootDir if specified)
    '@common': './common/types.graphql'
  }
}
```

Import examples:
- `#import User from "@schema"` → `/project/schema/main.graphql`
- `#import User from "@models/user.graphql"` → `/project/graphql/models/user.graphql`
- `#import User from "@types/user.graphql"` → `/project/graphql/types.graphql`
- `#import User from "@common"` → Resolved relative to rootDir

***

### rootDir?

> `optional` **rootDir?**: `string`

Defined in: [packages/import/src/index.ts:88](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L88)

Root directory for resolving relative paths in mappings. Defaults to the
current working directory.

#### Example

```ts
{
  rootDir: '/project/src/graphql',
  mappings: {
    '@types': './types' // Will resolve to '/project/src/graphql/types'
  }
}
```
