[![toolkit](https://user-images.githubusercontent.com/20847995/80261023-feb6e380-8691-11ea-8680-5747fa02c5d8.gif)](https://graphql-tools.com)

[![npm version](https://badge.fury.io/js/%40graphql-tools%2Futils.svg)](https://badge.fury.io/js/%40graphql-tools%2Futils)
[![CI](https://github.com/ardatan/graphql-tools/workflows/CI/badge.svg)](https://github.com/ardatan/graphql-tools/actions)
[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![renovate-app badge][renovate-badge]][renovate-app]

[renovate-badge]: https://img.shields.io/badge/renovate-app-blue.svg
[renovate-app]: https://renovateapp.com/

This package provides a few useful ways to create a GraphQL schema:

1. Use the GraphQL schema language to [generate a schema](https://graphql-tools.com/docs/generate-schema) with full support for resolvers, interfaces, unions, and custom scalars. The schema produced is completely compatible with [GraphQL.js](https://github.com/graphql/graphql-js).
2. [Mock your GraphQL API](https://graphql-tools.com/docs/mocking) with fine-grained per-type mocking
3. Automatically [stitch multiple schemas together](https://www.graphql-tools.com/docs/stitch-combining-schemas) into one larger API

## Documentation

[Read the docs.](https://graphql-tools.com/docs/introduction)

## Binding to HTTP

If you want to bind your JavaScript GraphQL schema to an HTTP server, you can use [`GraphQL Yoga`](https://www.graphql-yoga.com) .

You can develop your JavaScript based GraphQL API with `graphql-tools` and `GraphQL Yoga` together: One to write the schema and resolver code, and the other to connect it to a web server.

## Example

When using `graphql-tools`, you describe the schema as a GraphQL type language string:

```js
const typeDefs = /* GraphQL */ `
  type Author {
    id: ID! # the ! means that every author object _must_ have an id
    firstName: String
    lastName: String
    """
    the list of Posts by this author
    """
    posts: [Post]
  }

  type Post {
    id: ID!
    title: String
    author: Author
    votes: Int
  }

  # the schema allows the following query:
  type Query {
    posts: [Post]
  }

  # this schema allows the following mutation:
  type Mutation {
    upvotePost(postId: ID!): Post
  }

  # we need to tell the server which types represent the root query
  # and root mutation types. We call them RootQuery and RootMutation by convention.
  schema {
    query: Query
    mutation: Mutation
  }
`

export default typeDefs
```

Then you define resolvers as a nested object that maps type and field names to resolver functions:

```js
const resolvers = {
  Query: {
    posts() {
      return posts
    }
  },
  Mutation: {
    upvotePost(_, { postId }) {
      const post = find(posts, { id: postId })
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`)
      }
      post.votes += 1
      return post
    }
  },
  Author: {
    posts(author) {
      return filter(posts, { authorId: author.id })
    }
  },
  Post: {
    author(post) {
      return find(authors, { id: post.authorId })
    }
  }
}

export default resolvers
```

At the end, the schema and resolvers are combined using `makeExecutableSchema`:

```js
import { makeExecutableSchema } from '@graphql-tools/schema'

const executableSchema = makeExecutableSchema({
  typeDefs,
  resolvers
})
```

GraphQL-Tools schema can be consumed by frameworks like GraphQL Yoga, Apollo GraphQL or express-graphql
For example in Node.js;

```js
const { createServer } = require('@graphql-yoga/node')

const server = createServer({
  schema: executableSchema
})

server.start()
```

You can check [GraphQL Yoga](https://www.graphql-yoga.com) for other JavaScript platforms and frameworks besides vanilla Node.js HTTP.

This example has the entire type definition in one string and all resolvers in one file, but you can combine types and resolvers from multiple files and objects, as documented in the [modularizing type definitions](https://graphql-tools.com/docs/schema-merging#merging-type-definitions) and [merging resolvers](https://graphql-tools.com/docs/schema-merging#merging-resolvers) section of the docs.

## Contributions

Contributions, issues and feature requests are very welcome. If you are using this package and fixed a bug for yourself, please consider submitting a PR!

And if this is your first time contributing to this project, please do read our [Contributor Workflow Guide](https://github.com/the-guild-org/Stack/blob/master/CONTRIBUTING.md) before you get started off.

### Code of Conduct

Help us keep GraphQL Tools open and inclusive. Please read and follow our [Code of Conduct](https://github.com/the-guild-org/Stack/blob/master/CODE_OF_CONDUCT.md) as adopted from [Contributor Covenant](https://www.contributor-covenant.org/)

## Maintainers

- [@yaacovCR](https://github.com/yaacovCR)
- [@kamilkisiela](https://github.com/kamilkisiela) ([The Guild](https://github.com/the-guild-org))
- [@Urigo](https://github.com/Urigo) ([The Guild](https://github.com/the-guild-org))
- [@ardatan](https://github.com/ardatan) ([The Guild](https://github.com/the-guild-org))
- [@dotansimha](https://github.com/dotansimha) ([The Guild](https://github.com/the-guild-org))
