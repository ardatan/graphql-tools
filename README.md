# graphql-tools-fork: keep on stitching

[![npm version](https://badge.fury.io/js/graphql-tools-fork.svg)](https://badge.fury.io/js/graphql-tools-fork)
[![Build Status](https://travis-ci.org/yaacovCR/graphql-tools-fork.svg?branch=master)](https://travis-ci.org/yaacovCR/graphql-tools-fork)
[![Coverage Status](https://coveralls.io/repos/github/yaacovCR/graphql-tools-fork/badge.svg?branch=master)](https://coveralls.io/github/yaacovCR/graphql-tools-fork?branch=master)

This fork will hopefully provide more and more timely engagement with the community as we continue to support the following use cases, with the notable inclusion of schema stitching:

1. Use the GraphQL schema language to [generate a schema](https://graphql-tools-fork.netlify.com/docs/graphql-tools-fork/generate-schema.html) with full support for resolvers, interfaces, unions, and custom scalars. The schema produced is completely compatible with [GraphQL.js](https://github.com/graphql/graphql-js).
2. [Mock your GraphQL API](https://graphql-tools-fork.netlify.com/docs/graphql-tools-fork/mocking.html) with fine-grained per-type mocking
3. Automatically [stitch multiple schemas together](https://graphql-tools-fork.netlify.com/docs/graphql-tools-fork/schema-stitching.html) into one larger API

## Documentation

[Read the forked docs.](https://graphql-tools-fork.netlify.com/docs/graphql-tools-fork/)

See the changelog for recent changes:
* https://github.com/yaacovCR/graphql-tools-fork/blob/master/CHANGELOG.md

[Read the original docs.](https://www.apollographql.com/docs/graphql-tools/)

## Binding to HTTP

If you want to bind your JavaScript GraphQL schema to an HTTP server, we recommend using [Apollo Server](https://github.com/apollographql/apollo-server/), which supports every popular Node HTTP server library including Express, Koa, Hapi, and more.

JavaScript GraphQL servers are often developed with `graphql-tools` and `apollo-server-express` together: One to write the schema and resolver code, and the other to connect it to a web server.

## Example

[See and edit the live example on Launchpad.](https://launchpad.graphql.com/1jzxrj179)

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

This example has the entire type definition in one string and all resolvers in one file, but you can combine types and resolvers from multiple files and objects, as documented in the [modularizing the schema](https://graphql-tools-fork.netlify.com/docs/graphql-tools-fork/generate-schema.html#modularizing) section of the docs.

## Contributions

Contributions, issues and feature requests are very welcome. If you are using this package and fixed a bug for yourself, please consider submitting a PR!

## Maintainers

- [@yaacovCR](https://github.com/yaacovCR)
