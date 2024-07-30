---
'@graphql-tools/stitching-directives': minor
---

Support multiple entrypoints with `@merge(keyField)`

```graphql
type User {
  id: ID!
  name: String!
}

type Query {
  userById(id: ID!): User @merge(keyField: "id")
  userByName(name: String!): User @merge(keyField: "name")
}
```
