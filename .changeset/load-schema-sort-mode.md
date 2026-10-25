---
'@graphql-tools/load': minor
---

`loadSchema` and `loadSchemaSync` now accept `sortMode`.

`sort: true` still sorts the loaded schema. The default is `lexicographic`, which reorders types, fields, and enum values.

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
# sort: true
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

`sort: false` (or omitted) ignores `sortMode`.
