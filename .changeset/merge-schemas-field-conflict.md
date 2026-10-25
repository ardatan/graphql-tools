---
'@graphql-tools/schema': patch
---

`mergeSchemas` and `makeExecutableSchema` now accept `onFieldTypeConflict`, the same callback `mergeTypeDefs` already had.

Without it, merging two executable schemas keeps the earlier field type when only nullability differs. A visual schema diff that merges the previous and current schema therefore showed `Post.content: String!` even when the current schema had `String`.

```ts
mergeSchemas({
  schemas: [previousSchema, currentSchema],
  onFieldTypeConflict: (_existing, incoming) => incoming,
});
```

That merge now keeps `content: String` from the current schema.
