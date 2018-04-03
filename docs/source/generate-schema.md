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
    """
    the list of Posts by this author
    """
    posts: [Post]
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
    author: (_, { id }) => find(authors, { id }),
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
    posts: author => filter(posts, { authorId: author.id }),
  },
  
  Post: {
    author: post => find(authors, { id: post.authorId }),
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

As your schema grows larger and more complicated, you may want to define parts of it in different modules, and then import those modules to create the full schema.

Because Schema Definition Language does not have its own syntax for importing other schemas, nor any built-in syntax for defining resolvers, we recommend using the JavaScript module system to manage multiple schema modules.

There are many ways to approach this problem. The one we will describe below handles tricky edge cases like circular dependencies, and easily scales to large codebases.

The basic idea is to have each module export a `getTypes` function that returns an object mapping type names to schema fragment strings:

```js
// comment.js
const Comment = `
  type Comment {
    id: Int!
    message: String
    author: String
  }
`;

export function getTypes() {
  return { Comment };
}
```

Since `Comment` is the only type used in this fragment that isn't built into the GraphQL schema language, that's all this `getTypes` function needs to return.

```js
// post.js
import { getTypes as getCommentTypes } from './comment';

const Post = `
  type Post {
    id: Int!
    title: String
    content: String
    author: String
    comments: [Comment]
  }
`;

export function getTypes() {
  return { Post, ...getCommentTypes() };
}
```

Since the `Post` schema fragment refers to the `Comment` type, we use the `...getCommentTypes()` syntax to include the `Comment` schema fragment in the resulting object, along with the `Post` fragment and any other named schema fragments returned by `getCommentTypes()`.

Here's how `schema.js` might put everything together:

```js
// schema.js
import * as post from './post';

const Query = `
  type Query {
    post(id: Int!): Post
  }
`;

export function getTypes() {
  return {
    Query,
    // This map includes both Post and Comment, even though schema.js never
    // mentions the Comment type explicitly:
    ...post.getTypes(),
  };
}

export default makeExecutableSchema({
  // Generate an array of schema fragment strings from the getTypes() map.
  typeDefs: Object.values(getTypes()),
  resolvers: { ... },
});
```

You might wonder why we've defined a `getTypes` function instead of just exporting the type map as an object. The reason becomes clear when you consider modules that mutually depend on one another:

```js
// author.js
import { getTypes as getBookTypes } from './book';

const Author = `
  type Author {
    id: Int!
    firstName: String
    lastName: String
    books: [Book]
  }
`;

export function getTypes() {
  return { Author, ...getBookTypes() };
}
```

Of course, most `Book`s have `Author`s, so the `book.js` module also depends on `author.js`:

```js
// book.js
import { getTypes as getAuthorTypes } from './author';

const Book = `
  type Book {
    isbn: String!
    title: String
    author: Author
  }
`;

export function getTypes() {
  return { Book, ...getAuthorTypes() };
}
```

If `schema.js` imports `author.js` first, which then imports `book.js`, it would be a mistake for `book.js` to attempt to call `getAuthorTypes()` immediately, before the `author.js` module has initialized its `Author` export.

By deferring the creation of the type map until `schema.js` calls `author.getTypes()`, we give both `author.js` and `book.js` a chance to finish initializing their `Author` and `Book` variables.

```js
// schema.js
import * as author from './author';
import * as book from './book';

const Query = `
  type Query {
    author(id: Int!): Author
    book(isbn: String!): Book
  }
`;

export function getTypes() {
  return {
    Query,
    ...author.getTypes(),
    ...book.getTypes(),
  };
}

export default makeExecutableSchema({
  typeDefs: Object.values(getTypes()),
  resolvers: { ... },
});
```

Even though we know that `author.getTypes()` and `book.getTypes()` produce the same information, `schema.js` may not be aware of that redundancy, or might want to protect itself against future changes to the organization of your schema modules. Thanks to object `...spread` syntax, the `getTypes` function in `schema.js` will always return an object with exactly three keys: `Query`, `Author`, and `Book`.

You can apply this `getTypes` technique to resolvers as well: just have each module export a `getResolvers` function that merges together the resolvers of the types it depends on, using a utility like `lodash/merge`:

```js
import _merge from 'lodash/merge';
import * as author from './author';
import * as book from './book';

const Query = `
  type Query {
    author(id: Int!): Author
    book(isbn: String!): Book
  }
`;

export function getTypes() {
  return { Query, ...author.getTypes(), ...book.getTypes() };
}

const rootResolvers = {
  Query: {
    author() { ... },
    book() { ... }
  },
};

export function getResolvers() {
  return _merge(
    rootResolvers,
    author.getResolvers(),
    book.getResolvers(),
  );
}

export default makeExecutableSchema({
  typeDefs: Object.values(getTypes()),
  resolvers: getResolvers(),
});
```

Although this system is a bit more verbose than just putting everything into one big schema string, the advantages will become apparent as your schema gets larger, because you can add or remove types, fields, and resolvers without having to rewrite code in other modules.

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
"""
Description for the type
"""
type MyObjectType {
  """
  Description for field
  Supports multi-line description
  """
  myField: String!

  otherField(
    """
    Description for argument
    """
    arg: Int
  )

  oldField(
    """
    Description for argument
    """
    arg: Int
  ) @deprecated(reason: "Use otherField instead.")
}
```

This [GraphQL schema language cheat sheet](https://raw.githubusercontent.com/sogko/graphql-shorthand-notation-cheat-sheet/master/graphql-shorthand-notation-cheat-sheet.png) by Hafiz Ismail is an excellent reference for all the features of the GraphQL schema language.

<h2 id="api">API</h2>

<h3 id="makeExecutableSchema" title="makeExecutableSchema">makeExecutableSchema(options)</h3>

`makeExecutableSchema` takes a single argument: an object of options. Only the `typeDefs` option is required.

```
import { makeExecutableSchema } from 'graphql-tools';

const jsSchema = makeExecutableSchema({
  typeDefs,
  resolvers, // optional
  logger, // optional
  allowUndefinedInResolve = false, // optional
  resolverValidationOptions = {}, // optional
});
```

- `typeDefs` is a required argument and should be an GraphQL schema language string or array of GraphQL schema language strings or a function that takes no arguments and returns an array of GraphQL schema language strings. The order of the strings in the array is not important, but it must include a schema definition.

- `resolvers` is an optional argument _(empty object by default)_ and should be an object that follows the pattern explained in [article on resolvers](http://dev.apollodata.com/tools/graphql-tools/resolvers.html).

- `logger` is an optional argument, which can be used to print errors to the server console that are usually swallowed by GraphQL. The `logger` argument should be an object with a `log` function, eg. `const logger = { log: e => console.log(e) }`

- `parseOptions` is an optional argument which allows customization of parse when specifying `typeDefs` as a string.

- `allowUndefinedInResolve` is an optional argument, which is `true` by default. When set to `false`, causes your resolve functions to throw errors if they return undefined, which can help make debugging easier.

- `resolverValidationOptions` is an optional argument which accepts an object of the following shape: `{ requireResolversForArgs, requireResolversForNonScalar, requireResolversForAllFields, allowResolversNotInSchema }`.

    - `requireResolversForArgs` will cause `makeExecutableSchema` to throw an error if no resolve function is defined for a field that has arguments.

    - `requireResolversForNonScalar` will cause `makeExecutableSchema` to throw an error if a non-scalar field has no resolver defined. By default, both of these are true, which can help catch errors faster. To get the normal behavior of GraphQL, set both of them to `false`.
    
    - `requireResolversForAllFields` asserts that *all* fields have a valid resolve function.

    - `allowResolversNotInSchema` turns off the functionality which throws errors when resolvers are found which are not present in the schema. Defaults to `false`, to help catch common errors.
