---
title: Generating a schema
description: Generate a GraphQL schema from the concise type definition language.
---

The graphql-tools package allows you to create a GraphQL.js GraphQLSchema instance from GraphQL schema language using the function `makeExecutableSchema`.

<h2 id="example">Example</h2>

[See the complete live example in Apollo Launchpad.](https://launchpad.graphql.com/1jzxrj179)

When using `graphql-tools`, you describe the schema as a GraphQL type language string:

```js
const typeDefs = `
  type Author {
    id: Int!
    firstName: String
    lastName: String
    posts: [Post] # the list of Posts by this author
  }

  type Post {
    id: Int!
    title: String
    author: Author
    votes: Int
  }

  # the schema allows the following query:
  type Query {
    posts: [Post]
    author(id: Int!): Author
  }

  # this schema allows the following mutation:
  type Mutation {
    upvotePost (
      postId: Int!
    ): Post
  }
`;
```

Then you define resolvers as a nested object that maps type and field names to resolver functions:

```js
import { find, filter } from 'lodash';

// example data
const authors = [
  { id: 1, firstName: 'Tom', lastName: 'Coleman' },
  { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
  { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
];
const posts = [
  { id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2 },
  { id: 2, authorId: 2, title: 'Welcome to Meteor', votes: 3 },
  { id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1 },
  { id: 4, authorId: 3, title: 'Launchpad is Cool', votes: 7 },
];

const resolvers = {
  Query: {
    posts: () => posts,
    author: (_, { id }) => find(authors, { id: id }),
  },
  Mutation: {
    upvotePost: (_, { postId }) => {
      const post = find(posts, { id: postId });
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }
      post.votes += 1;
      return post;
    },
  },
  Author: {
    posts: (author) => filter(posts, { authorId: author.id }),
  },
  Post: {
    author: (post) => find(authors, { id: post.authorId }),
  },
};
```

At the end, the schema and resolvers are combined using `makeExecutableSchema`:

```js
import { makeExecutableSchema } from 'graphql-tools';

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
```

This example has the entire type definition in one string and all resolvers in one object, but you can combine types and resolvers from multiple files, as documented in the [modularizing the schema](#modularizing) section below.

<h2 id="modularizing">Modularizing the schema</h2>

If your schema gets large, you may want to define parts of it in different files and import them to create the full schema. This is possible by passing around arrays of schema strings.

```js
// comment.js
const Comment = `
  type Comment {
    id: Int!
    message: String
    author: String
  }
`;

export default Comment;
```

```js
// post.js
import Comment from './comment';

const Post = `
  type Post {
    id: Int!
    title: String
    content: String
    author: String
    comments: [Comment]
  }
`;

// we export Post and all types it depends on
// in order to make sure we don't forget to include
// a dependency
export default [Post, Comment];
```

```js
// schema.js
import Post from './post.js';

const RootQuery = `
  type RootQuery {
    post(id: Int!): Post
  }
`;

const SchemaDefinition = `
  schema {
    query: RootQuery
  }
`;

export default makeExecutableSchema({
  typeDefs: [
    SchemaDefinition, RootQuery,
    // we have to destructure array imported from the post.js file
    // as typeDefs only accepts an array of strings or functions
    ...Post
  ],
  // we could also concatenate arrays
  // typeDefs: [SchemaDefinition, RootQuery].concat(Post)
  resolvers: {},
});
```

If you're exporting array of schema strings and there are circular dependencies, the array can be wrapped in a function. The `makeExecutableSchema` function will only include each type definition once, even if it is imported multiple times by different types, so you don't have to worry about deduplicating the strings.

```js
// author.js
import Book from './book';

const Author = `
  type Author {
    id: Int!
    firstName: String
    lastName: String
    books: [Book]
  }
`;

// we export Author and all types it depends on
// in order to make sure we don't forget to include
// a dependency and we wrap it in a function
// to avoid strings deduplication
export default () => [Author, Book];
```

```js
// book.js
import Author from './author';

const Book = `
  type Book {
    title: String
    author: Author
  }
`;

export default () => [Book, Author];
```

```js
// schema.js
import Author from './author.js';

const RootQuery = `
  type RootQuery {
    author(id: Int!): Author
  }
`;

const SchemaDefinition = `
  schema {
    query: RootQuery
  }
`;

export default makeExecutableSchema({
  typeDefs: [SchemaDefinition, RootQuery, Author],
  resolvers: {},
});
```

You can do the same thing with resolvers - just pass around multiple resolver objects, and at the end combine them together using something like the Lodash `merge` function:

```js
import { merge } from 'lodash';

import { resolvers as gitHubResolvers } from './github/schema';
import { resolvers as sqlResolvers } from './sql/schema';

const rootResolvers = { ... };

// Merge all of the resolver objects together
const resolvers = merge(rootResolvers, gitHubResolvers, sqlResolvers);
```

<h2 id="extend-types">Extending Types</h2>

It's easy to add additional fields to existing types using the `extend` keyword.  Using `extend` is particularly useful in avoiding a large list of fields on root Queries and Mutations.  You can use it like this:

```js
const typeDefs = [`
  schema {
    query: Query
  }
  type Query {
    bars: [Bar]!
  }
  type Bar {
    id
  }
  `, `
  type Foo {
    id: String!
  }
  extend type Query {
    foos: [Foo]!
  }
`]
```

<h2 id="schema-language" title="GraphQL schema language">Learning the GraphQL schema language</h2>

The official documentation on graphql.org now has [a section about GraphQL schemas](http://graphql.org/learn/schema/) which explains all of the different schema features and how to use them with the schema language.

The type definitions must define a query type, which means a minimal schema would look something like this:
```js
const typeDefs = [`
  schema {
    query: RootQuery
  }

  type RootQuery {
    aNumber: Int
  }
`];
```

<h2 id="descriptions">Descriptions &amp; Deprecations</h2>
GraphiQL has built-in support for displaying docstrings with markdown syntax. You can easily add docstrings to types, fields and arguments like below:
```
# Description for the type
type MyObjectType {
  # Description for field
  myField: String!

  otherField(
    # Description for argument
    arg: Int
  )

  oldField(
    # Description for argument
    arg: Int
  ) @deprecated(reason: "Use otherField instead.")
}
```

This [GraphQL schema language cheat sheet](https://raw.githubusercontent.com/sogko/graphql-shorthand-notation-cheat-sheet/master/graphql-shorthand-notation-cheat-sheet.png) by Hafiz Ismail is an excellent reference for all the features of the GraphQL schema language.

<h2 id="api">API</h2>

<h3 id="makeExecutableSchema" title="makeExecutableSchema">makeExecutableSchema(options)</h3>

`makeExecutableSchema` takes a single argument: an object of options. Only the `typeDefs` and `resolvers` options are required.

```
import { makeExecutableSchema } from 'graphql-tools';

const jsSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
  logger, // optional
  allowUndefinedInResolve = false, // optional
  resolverValidationOptions = {}, // optional
});
```

- `typeDefs` is a required argument and should be an array of GraphQL schema language strings or a function that takes no arguments and returns an array of GraphQL schema language strings. The order of the strings in the array is not important, but it must include a schema definition.

- `resolvers` is a required argument and should be an object that follows the pattern explained in [article on resolvers](http://dev.apollodata.com/tools/graphql-tools/resolvers.html).

- `logger` is an optional argument, which can be used to print errors to the server console that are usually swallowed by GraphQL. The `logger` argument should be an object with a `log` function, eg. `const logger = { log: (e) => console.log(e) }`

- `allowUndefinedInResolve` is an optional argument, which is `true` by default. When set to `false`, causes your resolve functions to throw errors if they return undefined, which can help make debugging easier.

- `resolverValidationOptions` is an optional argument which accepts an object of the following shape: `{ requireResolversForArgs, requireResolversForNonScalar }`.

    - `requireResolversForArgs` will cause `makeExecutableSchema` to throw an error if no resolve function is defined for a field that has arguments.

    - `requireResolversForNonScalar` will cause `makeExecutableSchema` to throw an error if a non-scalar field has no resolver defined. By default, both of these are true, which can help catch errors faster. To get the normal behavior of GraphQL, set both of them to `false`.

    - `allowResolversNotInSchema` turns off the functionality which throws errors when resolvers are found which are not present in the schema. Defaults to `false`, to help catch common errors.
