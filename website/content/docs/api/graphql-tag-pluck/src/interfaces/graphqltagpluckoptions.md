---
title: "GraphQLTagPluckOptions"
description: "The GraphQLTagPluckOptions interface exported by @graphql-tools/graphql-tag-pluck."
---

Defined in: [packages/graphql-tag-pluck/src/index.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L20)

Additional options for determining how a file is parsed.

## Properties

### globalGqlIdentifierName?

> `optional` **globalGqlIdentifierName?**: `string` \| `string`[]

Defined in: [packages/graphql-tag-pluck/src/index.ts:113](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L113)

Allows to use a global identifier instead of a module import.
```js
// `graphql` is a global function
export const usersQuery = graphql`
  {
    users {
      id
      name
    }
  }
`;
```

***

### gqlMagicComment?

> `optional` **gqlMagicComment?**: `string`

Defined in: [packages/graphql-tag-pluck/src/index.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L94)

The magic comment anchor to look for when parsing GraphQL strings. Defaults to `graphql`.

***

### gqlVueBlock?

> `optional` **gqlVueBlock?**: `string`

Defined in: [packages/graphql-tag-pluck/src/index.ts:98](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L98)

The name of a custom Vue block that contains raw GraphQL to be plucked.

***

### isGqlTemplateLiteral?

> `optional` **isGqlTemplateLiteral?**: (`node`, `options`) => `boolean` \| `undefined`

Defined in: [packages/graphql-tag-pluck/src/index.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L130)

A custom way to determine if a template literal node contains a GraphQL query.
By default, it checks if the leading comment is equal to the `gqlMagicComment` option.

#### Parameters

##### node

`TemplateLiteral` \| `ExpressionStatement`

##### options

`Omit`\<`GraphQLTagPluckOptions`, `"isGqlTemplateLiteral"` \| `"pluckStringFromFile"`\>

#### Returns

`boolean` \| `undefined`

***

### modules?

> `optional` **modules?**: `object`[]

Defined in: [packages/graphql-tag-pluck/src/index.ts:90](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L90)

Additional options for determining how a file is parsed. An array of packages that are responsible for exporting the GraphQL string parser function. The following modules are supported by default:
```js
{
  modules: [
    {
      // import gql from 'graphql-tag'
      name: 'graphql-tag',
    },
    {
      name: 'graphql-tag.macro',
    },
    {
      // import { graphql } from 'gatsby'
      name: 'gatsby',
      identifier: 'graphql',
    },
    {
      name: 'apollo-server-express',
      identifier: 'gql',
    },
    {
      name: 'apollo-server',
      identifier: 'gql',
    },
    {
      name: 'react-relay',
      identifier: 'graphql',
    },
    {
      name: 'apollo-boost',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-koa',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-hapi',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-fastify',
      identifier: 'gql',
    },
    {
      name: ' apollo-server-lambda',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-micro',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-azure-functions',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-cloud-functions',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-cloudflare',
      identifier: 'gql',
    },
  ];
}
```

#### identifier?

> `optional` **identifier?**: `string`

#### name

> **name**: `string`

***

### pluckStringFromFile?

> `optional` **pluckStringFromFile?**: (`code`, `node`, `options`) => `string` \| `null` \| `undefined`

Defined in: [packages/graphql-tag-pluck/src/index.ts:121](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L121)

A function that allows custom extraction of GraphQL strings from a file.

#### Parameters

##### code

`string`

##### node

`TemplateLiteral`

##### options

`Omit`\<`GraphQLTagPluckOptions`, `"isGqlTemplateLiteral"` \| `"pluckStringFromFile"`\>

#### Returns

`string` \| `null` \| `undefined`

***

### skipIndent?

> `optional` **skipIndent?**: `boolean`

Defined in: [packages/graphql-tag-pluck/src/index.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L117)

Set to `true` in order to get the found documents as-is, without any changes indentation changes
