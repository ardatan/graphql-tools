---
'@graphql-tools/federation': patch
---

If there are repeated computed fields like below, project the data for the computed fields for each `fields` and merge them correctly.
And if they are array as in `userOrders`, merge them by respecting the order (the second one can have `price` maybe).

```graphql
type UserOrder @key(fields: "id") {
  id: ID!
  status: String!
  price: Int!
}

type User @key(fields: "id") {
  id: ID!
  userOrders: [UserOrder!] @external
  totalOrdersPrices: Int @requires(fields: "userOrders { id }")
  aggregatedOrdersByStatus: Int @requires(fields: "userOrders { id }")
}
```
