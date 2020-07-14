---
id: "_graphql_tag_pluck_src_index_.graphqltagpluckoptions"
title: "GraphQLTagPluckOptions"
sidebar_label: "GraphQLTagPluckOptions"
---

Additional options for determining how a file is parsed.

## Hierarchy

* **GraphQLTagPluckOptions**

## Index

### Properties

* [globalGqlIdentifierName](_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md#optional-globalgqlidentifiername)
* [gqlMagicComment](_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md#optional-gqlmagiccomment)
* [modules](_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md#optional-modules)

## Properties

### `Optional` globalGqlIdentifierName

• **globalGqlIdentifierName**? : *string | string[]*

*Defined in [packages/graphql-tag-pluck/src/index.ts:100](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L100)*

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

___

### `Optional` gqlMagicComment

• **gqlMagicComment**? : *string*

*Defined in [packages/graphql-tag-pluck/src/index.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L85)*

The magic comment anchor to look for when parsing GraphQL strings. Defaults to `graphql`.

___

### `Optional` modules

• **modules**? : *Array‹object›*

*Defined in [packages/graphql-tag-pluck/src/index.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L81)*

Additional options for determining how a file is parsed.An array of packages that are responsible for exporting the GraphQL string parser function. The following modules are supported by default:
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
