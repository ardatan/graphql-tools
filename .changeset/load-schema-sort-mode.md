---
'@graphql-tools/load': minor
---

`loadSchema` and `loadSchemaSync` now accept `sortMode` when `sort` is true.

`sort: true` still sorts the loaded schema. The default is `lexicographic`, which uses GraphQL's `lexicographicSortSchema` and reorders types, fields, and enum values.

`sortMode: 'typesOnly'` sorts only the type list. Field and enum value order stay as they were loaded.

```graphql
# loaded schema
enum DayOfWeek {
  SUNDAY
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
}

type Query {
  d: String
  z: String
  a: String
  day: DayOfWeek
}

type User {
  aa: String
  a: String
}

type A {
  s: String
  b: String
}
```

```ts
loadSchema('schema.graphql', {
  loaders: [new GraphQLFileLoader()],
  sort: true,
  sortMode: 'typesOnly',
});
```

DayOfWeek stays SUNDAY through SATURDAY. Query fields stay `d`, `z`, `a`, `day`.

`sort: false` (or omitted) ignores `sortMode`.
