---
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": patch
---

Ignore unmerged fields

Let's say you have a gateway schema like in the bottom, and `id` is added to the query, only if the `age` is requested;

```graphql
# This will be sent as-is
{
  user {
    name
  }
}
```

But the following will be transformed;
```graphql
{
  user {
    name
    age
  }
}
```
Into
```graphql
{
  user {
    id
    name
    age
  }
}


```graphql
type Query {
  user: User
}

type User {
  id: ID! # is the key for all services
  name: String!
  age: Int! # This comes from another service
}
```
