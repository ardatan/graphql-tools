---
'@graphql-tools/federation': patch
'@graphql-tools/delegate': patch
---

Handle merged selection sets in the computed fields;

When a selection set for a computed field needs to be merged, resolve that required selection set fully then resolve the computed field.
In the following case, the selection set for the `author` field in the `Post` type is merged with the selection set for the `authorId` field in the `Comment` type.

```graphql
type Query {
  feed: [Post!]!
}

type Post {
  id: ID!
  author: User! @computed(selectionSet: "{ comments { authorId } }")
}

type Comment {
  id: ID!
  authorId: ID!
}

type User {
  id: ID!
  name: String!
}
```

```graphql
type Post {
  id: ID!
  comments: [Comment!]!
}

type Comment {
  id: ID!
}
```
