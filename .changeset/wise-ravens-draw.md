---
'@graphql-tools/delegate': patch
---

Fix extra inline fragments for all abstract types in the upstream schema call

If there are two subschemas like below, the final `Node` interface is implemented by both `Oven` and `Toaster` while they are not implemented in both schemas.
In this case the query `{ products { id ... on Node { id } } }` will need to be transformed to `{ products { id ... on Oven { id } ... on Node { id } } }` for the first subschema. But previously the query planner was automatically creating inline fragments for all possible types which was not optimal. Now it adds inline fragments only if this case is seen.

```graphql
type Query {
  products: [Product]
}

union Product = Oven | Toaster


interface Node {
  id: ID!
}

type Oven {
  id: ID!
}

type Toaster implements Node {
  id: ID!
  warranty: Int
}
```

And another one like below;

```graphql
interface Node {
  id: ID!
}

type Oven implements Node {
  id: ID!
  warranty: Int
}
```
