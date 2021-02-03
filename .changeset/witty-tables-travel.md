---
'@graphql-tools/mock': major
---

Reworked to add state-full behavior to the library:
- Breaking: mock functions does not receive resolver arguments anymore and can't return promise. Use `resolvers` option instead.
- Breaking: when preserved, resolvers will not receive plain object returned by mock anymore as source but rather a `Ref` that can be used to query the store.
- Deprecated: MockList is deprecated. Use plain arrays instead.

See [migration guide](https://www.graphql-tools.com/docs/mocking/#migration-from-v7-and-below).
