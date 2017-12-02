# GraphQL-tools: generate and mock GraphQL.js schemas

[![npm version](https://badge.fury.io/js/graphql-tools.svg)](https://badge.fury.io/js/graphql-tools)
[![Build Status](https://travis-ci.org/apollographql/graphql-tools.svg?branch=master)](https://travis-ci.org/apollographql/graphql-tools)
[![Coverage Status](https://coveralls.io/repos/github/apollographql/graphql-tools/badge.svg?branch=master)](https://coveralls.io/github/apollographql/graphql-tools?branch=master)
[![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

This package provides a few useful ways to create a GraphQL schema:

1. Use the GraphQL schema language to [generate a schema](http://dev.apollodata.com/tools/graphql-tools/generate-schema.html) with full support for resolvers, interfaces, unions, and custom scalars. The schema produced is completely compatible with [GraphQL.js](https://github.com/graphql/graphql-js).
2. [Mock your GraphQL API](http://dev.apollodata.com/tools/graphql-tools/mocking.html) with fine-grained per-type mocking
3. Automatically [stitch multiple schemas together](http://dev.apollodata.com/tools/graphql-tools/schema-stitching.html) into one larger API

## Documentation

[Read the docs.](http://dev.apollodata.com/tools/graphql-tools/index.html)

## Example

[See and edit the live example on Launchpad.](https://launchpad.graphql.com/1jzxrj179)

When using `graphql-tools`, you describe the schema as a GraphQL type language string:

```js

const typeDefs = `
type Author {
  id: ID! # the ! means that every author object _must_ have an id
  firstName: String
  lastName: String
  posts: [Post] # the list of Posts by this author
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

This example has the entire type definition in one string and all resolvers in one file, but you can combine types and resolvers from multiple files and objects, as documented in the [modularizing the schema](https://www.apollographql.com/docs/graphql-tools/generate-schema.html#modularizing) section of the docs.

## Contributions

Contributions, issues and feature requests are very welcome. If you are using this package and fixed a bug for yourself, please consider submitting a PR!
