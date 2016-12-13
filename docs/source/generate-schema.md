---
title: Generating a schema
order: 304
description: Generate a GraphQL schema from the concise type definition language.
---

The graphql-tools package allows you to create a GraphQL.js GraphQLSchema instance from GraphQL schema language using the function `makeExecutableSchema`.

<h2 id="example">Example</h2>

The ["Hello World" server](https://github.com/apollostack/frontpage-server) which powers the main Apollo Client examples is a great place to start if you're looking for a minimal codebase powered by `graphql-tools`.

When using `graphql-tools`, you describe the schema as a GraphQL type language string:

```js

export default `
type Author {
  id: Int! # the ! means that every author object _must_ have an id
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
}

# this schema allows the following mutation:
type Mutation {
  upvotePost (
    postId: Int!
  ): Post
}

# we need to tell the server which types represent the root query
# and root mutation types. We call them RootQuery and RootMutation by convention.
schema {
  query: Query
  mutation: Mutation
}
`;
```

Then you define resolvers as a nested object that maps type and field names to resolver functions:

```js
const resolveFunctions = {
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
```

At the end, the schema and resolvers are combined using `makeExecutableSchema`:

```js
import Schema from './data/schema.js';
import Resolvers from './data/resolvers';

const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers,
});
```

This example has the entire type definition in one string and all resolvers in one object, but you can combine types and resolvers from multiple files, as documented below in the [modularizing the schema](#modularizing) section.

<h2 id="modularizing">Modularizing the schema</h2>

If your schema gets large, you may want to define parts of it in different files and import them to create the full schema. This is possible by passing around arrays of schema strings. If there are circular dependencies, the array can be wrapped in a function. `makeExecutableSchema` will only include each type definition once, even if it is imported multiple times by different types, so you don't have to worry about deduplicating the strings.

```js
// author.js
import Book from './book';

const Author = `
  type Author {
    name: String
    books: [Book]
  }
`;

// we export Author and all types it depends on
// in order to make sure we don't forget to include
// a dependency
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
    author(name: String): Author
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

<h2 id="schema-language">Learning the GraphQL schema language</h2>

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

<h2>Descriptions</h2>
GraphiQL has built-in support for displaying docstrings with markdown syntax. You can easily add docstrings to types, fiedlds and arguments like below:
```
# Description for the type
type MyObjectType {
  # Description for field
  myField: String!
  
  otherField(
    # Description for argument
    arg: Int
  )
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

- `allowUndefinedInResolve` is an optional argument, which is `false` by default, and causes your resolve function to throw an error, if they return undefined. This can help make debugging easier. To get the default behavior of GraphQL, set this option to `true`.

- `resolverValidationOptions` is an optional argument which accepts an object of the following shape: `{ requireResolversForArgs, requireResolversForNonScalar }`.

    - `requireResolversForArgs` will cause `makeExecutableSchema` to throw an error if no resolve function is defined for a field that has arguments.

    - `requireResolversForNonScalar` will cause `makeExecutableSchema` to throw an error if a non-scalar field has no resolver defined. By default, both of these are true, which can help catch errors faster. To get the normal behavior of GraphQL, set both of them to `false`.
