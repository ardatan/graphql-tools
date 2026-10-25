---
'@graphql-tools/load': minor
---

`loadSchema` and `loadSchemaSync` already accept `sort: true`. That always runs GraphQL's `lexicographicSortSchema`, which reorders the type list and also reorders fields, arguments, and enum values.

A schema that was written with a meaningful enum or field order cannot keep that order after load:

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

```graphql
# sort: true (current default)
type A {
  b: String
  s: String
}

enum DayOfWeek {
  FRIDAY
  MONDAY
  SATURDAY
  SUNDAY
  THURSDAY
  TUESDAY
  WEDNESDAY
}

type Query {
  a: String
  d: String
  day: DayOfWeek
  z: String
}

type User {
  a: String
  aa: String
}
```

This release adds `sortMode` on `LoadSchemaOptions`.

- `sort: true` with no `sortMode`, or `sortMode: 'lexicographic'`, keeps the current behavior.
- `sort: true, sortMode: 'typesOnly'` sorts only the type list. Field and enum value order stay as they were loaded. If the same type is split across files, those members keep merge order instead of being sorted.
- `sort: false` (or omitted) ignores `sortMode`.

```ts
loadSchema('schema.graphql', {
  loaders: [new GraphQLFileLoader()],
  sort: true,
  sortMode: 'typesOnly',
});
```

```graphql
# sort: true, sortMode: 'typesOnly'
type A {
  s: String
  b: String
}

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
```
