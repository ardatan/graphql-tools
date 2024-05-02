---
"@graphql-tools/federation": patch
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": patch
---

When there is a Node subschema, and others to resolve the rest of the entities by using a union resolver as in Federation like below, it was failing. This version fixes that issue.

```graphql
query {
  node(id: "1") {
    id # Fetches from Node
    ... on User {
      name # Fetches from User
    }
  }
}
```

```graphql
type Query {
  node(id: ID!): Node
}

interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
}

type Post implements Node {
  id: ID!
}
```

```graphql
# User subschema
scalar _Any
type Query {
  _entities(representations: [_Any!]!): [_Entity]!
}
union _Entity = User
interface Node {
  id: ID!
}
type User implements Node {
  id: ID!
  name: String!
}
```

```graphql
# Post subschema
scalar _Any
union _Entity = Post
type Query {
  _entities(representations: [_Any!]!): [_Entity]!
}
interface Node {
  id: ID!
}
type Post implements Node {
  id: ID!
  title: String!
}
```
