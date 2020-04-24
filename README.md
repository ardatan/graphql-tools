![tool](https://www.graphql-tools.com/img/banner.gif)

[![npm version](https://badge.fury.io/js/graphql-tools.svg)](https://badge.fury.io/js/graphql-tools)
[![CI](https://github.com/ardatan/graphql-toolkit/workflows/CI/badge.svg)](https://github.com/ardatan/graphql-toolkit/actions)
[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)

This package provides a few useful ways to create a GraphQL schema:

1. Use the GraphQL schema language to [generate a schema](https://graphql-tools.com/docs/generate-schema) with full support for resolvers, interfaces, unions, and custom scalars. The schema produced is completely compatible with [GraphQL.js](https://github.com/graphql/graphql-js).
2. [Mock your GraphQL API](https://graphql-tools.com/docs/mocking) with fine-grained per-type mocking
3. Automatically [stitch multiple schemas together](https://graphql-tools.com/docs/schema-stitching) into one larger API

## Documentation

[Read the docs.](https://graphql-tools.com/docs/introduction)

## Binding to HTTP

If you want to bind your JavaScript GraphQL schema to an HTTP server, you can use [`express-graphql`](https://github.com/graphql/express-graphql).

You can develop your Javascript based GraphQL API with `graphql-tools` and `express-graphql` together: One to write the schema and resolver code, and the other to connect it to a web server.

## Example

When using `graphql-tools`, you describe the schema as a GraphQL type language string:

```js

const typeDefs = `
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
  upvotePost (
    postId: ID!
  ): Post
}

# we need to tell the server which types represent the root query
# and root mutation types. We call them RootQuery and RootMutation by convention.
schema {
  query: Query
  mutation: Mutation
}
`;

export default typeDefs;
```

Then you define resolvers as a nested object that maps type and field names to resolver functions:

```js
const resolvers = {
  Query: {
    posts() {
      return posts;
    },
  },
  Mutation: {
    upvotePost(_, { postId }) {
      const post = find(posts, { id: postId });
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }
      post.votes += 1;
      return post;
    },
  },
  Author: {
    posts(author) {
      return filter(posts, { authorId: author.id });
    },
  },
  Post: {
    author(post) {
      return find(authors, { id: post.authorId });
    },
  },
};

export default resolvers;
```

At the end, the schema and resolvers are combined using `makeExecutableSchema`:

```js
import { makeExecutableSchema } from 'graphql-tools';

const executableSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
```

This example has the entire type definition in one string and all resolvers in one file, but you can combine types and resolvers from multiple files and objects, as documented in the [modularizing type definitions](https://graphql-tools/merge-typedefs.html) and [merging resolvers](https://graphql-tools/merge-resolvers.html) section of the docs.

## Contributions

Contributions, issues and feature requests are very welcome. If you are using this package and fixed a bug for yourself, please consider submitting a PR!

## Maintainers

- [@yaacovCR](https://github.com/yaacovCR)
- [@kamilkisiela](https://github.com/kamilkisiela) ([The Guild](https://github.com/the-guild-org))
- [@Urigo](https://github.com/Urigo) ([The Guild](https://github.com/the-guild-org))
- [@ardatan](https://github.com/ardatan) ([The Guild](https://github.com/the-guild-org))
- [@dotansimha](https://github.com/dotansimha) ([The Guild](https://github.com/the-guild-org))
