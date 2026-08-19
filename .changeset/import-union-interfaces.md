---
'@graphql-tools/import': patch
---

Named `# import` of a type no longer drops interfaces implemented by union members.

Before this, a file like:

```graphql
# import Foo from "./types.graphql"

type Query {
  foo: Foo
}
```

with `types.graphql` containing `type Foo { pet: Pet }`, `union Pet = Cat | Dog`, and `type Cat implements Animal` built an invalid schema (`Unknown type "Animal"`). `Cat` and `Dog` were pulled in through the union, but `Animal` was not.

Forward dependencies (fields, `implements`, union members) are now closed transitively. Reverse implementers are still attached only when the interface itself is the import, so `# import Query.posts` does not pull every other `Query` field.
