[graphql-tools-monorepo](../README) / [graphql-tag-pluck/src](../modules/graphql_tag_pluck_src) /
GraphQLTagPluckOptions

# Interface: GraphQLTagPluckOptions

[graphql-tag-pluck/src](../modules/graphql_tag_pluck_src).GraphQLTagPluckOptions

Additional options for determining how a file is parsed.

## Table of contents

### Properties

- [globalGqlIdentifierName](graphql_tag_pluck_src.GraphQLTagPluckOptions#globalgqlidentifiername)
- [gqlMagicComment](graphql_tag_pluck_src.GraphQLTagPluckOptions#gqlmagiccomment)
- [isGqlTemplateLiteral](graphql_tag_pluck_src.GraphQLTagPluckOptions#isgqltemplateliteral)
- [modules](graphql_tag_pluck_src.GraphQLTagPluckOptions#modules)
- [pluckStringFromFile](graphql_tag_pluck_src.GraphQLTagPluckOptions#pluckstringfromfile)
- [skipIndent](graphql_tag_pluck_src.GraphQLTagPluckOptions#skipindent)

## Properties

### globalGqlIdentifierName

• `Optional` **globalGqlIdentifierName**: `string` \| `string`[]

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
`
```

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:108](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L108)

---

### gqlMagicComment

• `Optional` **gqlMagicComment**: `string`

The magic comment anchor to look for when parsing GraphQL strings. Defaults to `graphql`.

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:93](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L93)

---

### isGqlTemplateLiteral

• `Optional` **isGqlTemplateLiteral**: (`node`: `ExpressionStatement` \| `TemplateLiteral`,
`options`: `Omit`\<[`GraphQLTagPluckOptions`](graphql_tag_pluck_src.GraphQLTagPluckOptions),
`"isGqlTemplateLiteral"` \| `"pluckStringFromFile"`>) => `undefined` \| `boolean`

#### Type declaration

▸ (`node`, `options`): `undefined` \| `boolean`

A custom way to determine if a template literal node contains a GraphQL query. By default, it checks
if the leading comment is equal to the `gqlMagicComment` option.

##### Parameters

| Name      | Type                                                                                                                                   |
| :-------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `node`    | `ExpressionStatement` \| `TemplateLiteral`                                                                                             |
| `options` | `Omit`\<[`GraphQLTagPluckOptions`](graphql_tag_pluck_src.GraphQLTagPluckOptions), `"isGqlTemplateLiteral"` \| `"pluckStringFromFile"`> |

##### Returns

`undefined` \| `boolean`

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:125](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L125)

---

### modules

• `Optional` **modules**: \{ `identifier?`: `string` ; `name`: `string` }[]

Additional options for determining how a file is parsed. An array of packages that are responsible
for exporting the GraphQL string parser function. The following modules are supported by default:

```js
{
  modules: [
    {
      // import gql from 'graphql-tag'
      name: 'graphql-tag'
    },
    {
      name: 'graphql-tag.macro'
    },
    {
      // import { graphql } from 'gatsby'
      name: 'gatsby',
      identifier: 'graphql'
    },
    {
      name: 'apollo-server-express',
      identifier: 'gql'
    },
    {
      name: 'apollo-server',
      identifier: 'gql'
    },
    {
      name: 'react-relay',
      identifier: 'graphql'
    },
    {
      name: 'apollo-boost',
      identifier: 'gql'
    },
    {
      name: 'apollo-server-koa',
      identifier: 'gql'
    },
    {
      name: 'apollo-server-hapi',
      identifier: 'gql'
    },
    {
      name: 'apollo-server-fastify',
      identifier: 'gql'
    },
    {
      name: ' apollo-server-lambda',
      identifier: 'gql'
    },
    {
      name: 'apollo-server-micro',
      identifier: 'gql'
    },
    {
      name: 'apollo-server-azure-functions',
      identifier: 'gql'
    },
    {
      name: 'apollo-server-cloud-functions',
      identifier: 'gql'
    },
    {
      name: 'apollo-server-cloudflare',
      identifier: 'gql'
    }
  ]
}
```

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:89](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L89)

---

### pluckStringFromFile

• `Optional` **pluckStringFromFile**: (`code`: `string`, `node`: `TemplateLiteral`, `options`:
`Omit`\<[`GraphQLTagPluckOptions`](graphql_tag_pluck_src.GraphQLTagPluckOptions),
`"isGqlTemplateLiteral"` \| `"pluckStringFromFile"`>) => `undefined` \| `null` \| `string`

#### Type declaration

▸ (`code`, `node`, `options`): `undefined` \| `null` \| `string`

A function that allows custom extraction of GraphQL strings from a file.

##### Parameters

| Name      | Type                                                                                                                                   |
| :-------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `code`    | `string`                                                                                                                               |
| `node`    | `TemplateLiteral`                                                                                                                      |
| `options` | `Omit`\<[`GraphQLTagPluckOptions`](graphql_tag_pluck_src.GraphQLTagPluckOptions), `"isGqlTemplateLiteral"` \| `"pluckStringFromFile"`> |

##### Returns

`undefined` \| `null` \| `string`

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:116](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L116)

---

### skipIndent

• `Optional` **skipIndent**: `boolean`

Set to `true` in order to get the found documents as-is, without any changes indentation changes

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:112](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L112)
