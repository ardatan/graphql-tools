---
'@graphql-tools/schema': patch
---

`mergeSchemas` and `makeExecutableSchema` now accept `onFieldTypeConflict`, the same callback `mergeTypeDefs` already had.

A visual schema diff merges the previous schema with the current one so added fields stay, removed fields stay, and changed fields can be marked. Default merge does not do that for types:

```graphql
# previous
type Post {
  id: ID!
  title: String!
  content: String!
  published: Boolean!
}

type User {
  id: ID!
}

# current
type Post {
  id: ID!
  title: String
  content: Int
  fieldA: Int
  fieldB: String
}
```

Without a callback, `content: String!` vs `content: Int` throws. Nullability-only changes such as `title: String!` vs `title: String` silently keep the earlier `String!`.

```ts
mergeSchemas({
  schemas: [previousSchema, currentSchema],
  onFieldTypeConflict: (_existing, incoming) => incoming,
});
```

Now the merged `Post` has `title: String` and `content: Int` from the current schema, `published: Boolean!` from the previous schema, `fieldA` / `fieldB` from the current schema, and `User` is still present.

The same callback applies to mutation arguments. Returning the incoming field keeps current argument types and still unions arguments that exist on only one side (`argE` from previous, `argF` from current). Returning the existing field with `reverseArguments: true` keeps the earlier argument types and still appends new arguments.
