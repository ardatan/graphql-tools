---
"@graphql-tools/federation": patch
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": patch
---

If the gateway receives a query with an overlapping fields for the subschema, it uses aliases to resolve it correctly.

Let's say subschema A has the following schema;

```graphql
  type Query {
    user: User
  }

  interface User {
    id: ID!
    name: String!
  }

  type Admin implements User {
    id: ID!
    name: String!
    role: String!
  }

  type Customer implements User {
    id: ID!
    name: String
    email: String
  }
```

And let's say the gateway has the following schema instead;

```graphql
  type Query {
    user: User
  }

  interface User {
    id: ID!
    name: String!
  }

  type Admin implements User {
    id: ID!
    name: String!
    role: String!
  }

  type Customer implements User {
    id: ID!
    name: String!
    email: String!
  }
```

In this case, the following query is fine for the gateway but for the subschema, it's not;

```graphql
  query {
    user {
      ... on Admin {
        id
        name # This is nullable in the subschema
        role
      }
      ... on Customer {
        id
        name # This is non-nullable in the subschema
        email
      }
    }
  }
```

So the subgraph will throw based on this rule [OverlappingFieldsCanBeMerged](https://github.com/graphql/graphql-js/blob/main/src/validation/rules/OverlappingFieldsCanBeMergedRule.ts)

To avoid this, the gateway will use aliases to resolve the query correctly. The query will be transformed to the following;

```graphql
  query {
    user {
      ... on Admin {
        id
        name # This is nullable in the subschema
        role
      }
      ... on Customer {
        id
        name: _nullable_name # This is non-nullable in the subschema
        email
      }
    }
  }
```
