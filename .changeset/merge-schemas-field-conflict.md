---
'@graphql-tools/schema': patch
---

`mergeSchemas` and `makeExecutableSchema` now accept `onFieldTypeConflict`, the same callback `mergeTypeDefs` already had.

When two schemas define the same field with different types, default merge throws. When only nullability differs, it keeps the earlier type.

```graphql
# first schema
type Post {
  id: ID!
  title: String!
  content: String!
  published: Boolean!
}

# second schema
type Post {
  id: ID!
  title: String
  content: Int
  fieldA: Int
  fieldB: String
}
```

`content: String!` vs `content: Int` throws. `title: String!` vs `title: String` keeps `String!`.

```ts
mergeSchemas({
  schemas: [firstSchema, secondSchema],
  onFieldTypeConflict: (_existing, incoming) => incoming,
});
```

The merged `Post` takes `title: String` and `content: Int` from the second schema, keeps `published` from the first, and adds `fieldA` / `fieldB`. Types that exist on only one schema, such as `User` on the first, stay.

The same callback applies to field arguments. Returning the incoming field uses the second schema's argument types and still keeps arguments that exist on only one side. Returning the existing field with `reverseArguments: true` keeps the first schema's argument types and still appends new arguments.
