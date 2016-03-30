# A neat GraphQL server in JavaScript

MVP for a GraphQL server that makes the developers' life easier.

This GraphQL server is built on
* graphql-js

## How to use:

Apollo-server takes three inputs:
1. A GraphQL schema in shorthand format
1. One or more javascript code files that defines resolve functions
1. One or more javascript code files that define data loaders

An example of a valid GraphQL shorthand input:
```
type Book {
  id: ID!
  title: String!
  genre: Genre
  author: Author
}

interface Person {
  firstName: String!
  lastName: String
  middleName: String
}

type Author: Person {
  id: ID!
  firstName: String!
  lastName: String
  middleName: String
  booksPublished: [Book]
}

enum Genre {
  FICTION
  NONFICTION
}

type RootQuery {
  author(id: ID!): Author,
  book(title: String!): Book
}

type RootMutation {
  addBook(title: String!, genre: Genre!, author_id: ID): Book
}
```

The corresponding file that defines how fields are resolved. If a field does not
have a resolve function, it is assumed to be the standard resolve function.
Resolve functions should be stateless.
```
const resolveFunctions = {
  Book: {
    author(book, _, ctx){ return ctx.loaders.author.get(book.author_id) },

    // fields without resolve function just return book.<fieldName>
  },

  Author: {
    booksPublished(author, _, _){ return ctx.loaders.book.list( {author_id: author.id }) },
  },

  RootQuery: {
    author(_, { id }, ctx){ return ctx.loaders.author.get(id) },
    book(_, { title }, ctx){ return ctx.loaders.book.getByTitle(title) },
  },

  RootMutation: {
    addBook(_, { title, genre, author_id }, ctx){
      return ctx.loaders.book.createBook({ title: title, genre: genre, author_id: author_id });
    },
  },
};
export default resolveFunctions;
```

And in a file that defines the data loaders:
```
// imports ...

const loaders = {
  book: {
    createBook(args){
      return knex('books').insert({ ...args });
    },
  },
  // etc.
};

export default loaders;
```


Providing a schema in this format has the advantage of staying relatively close
to graphql-js while at the same time separating the type system from the
resolve rules for clarity.

Separating data loaders from resolve functions makes them easier to reason about and to test. It
also means that the only stateful part is clearly separated from the rest of the system, which
has benefits for scaling.

It is still possible to dynamically generate the resolve functions, as they just
have to be exported from the file that Apollo Proxy imports for the schema.


It is also possible to not use the shorthand with resolve definitions and simply
upload a schema for graphql-js in the standard format.
