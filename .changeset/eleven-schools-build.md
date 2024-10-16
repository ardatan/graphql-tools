---
'@graphql-tools/federation': patch
'@graphql-tools/delegate': patch
'@graphql-tools/stitch': patch
---

When there are two services like below then the following query senty, the gateway tries to fetch `id` as an extra field because it considers `id` might be needed while this is not correct.
This patch avoids any extra calls, and forwards the query as is to the 2nd service.

```graphql
query {
  viewer {
    booksContainer(input: $input) {
      edges {
        cursor
        node {
          source {
            # Book(upc=)
            upc
          }
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
}
```

```graphql
type Book @key(fields: "id") @key(fields: "upc") {
  id: ID!
  upc: ID!
}
```

```graphql
type BookContainer { # the type that is used in a collection
  id: ID!
  # ... other stuff here
  source: Book!
}

type Book @key(fields: "upc") {
  upc: ID!
}

type Query {
  viewer: Viewer
}

type Viewer {
  booksContainer: BooksContainerResult
}

type BooksContainerResult {
  edges: [BooksContainerEdge!]!
  pageInfo: PageInfo!
}

type BooksContainerEdge {
  node: BookContainer!
  cursor: String!
}

type PageInfo {
  endCursor: String
}
```
