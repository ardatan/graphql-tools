---
"@graphql-tools/stitch": minor
---

New option `useNonNullableFieldOnConflict` in `typeMergingOptions` of `stitchSchemas`

When you have two schemas like below, you will get a warning about the conflicting fields because `name` field is defined as non-null in one schema and nullable in the other schema, and non-nullable field can exist in the stitched schema because of the order or any other reasons, and this might actually cause an unexpected behavior when you fetch `User.name` from the one who has it as non-nullable.
This option supresses the warning, and takes the field from the schema that has it as non-nullable.

```graphql
  type Query {
    user: User
  }

  type User {
    id: ID!
    name: String
    email: String
  }
```
And;

```graphql
  type Query {
    user: User
  }

  type User {
    id: ID!
    name: String!
  }
```


