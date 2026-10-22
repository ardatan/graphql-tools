---
'@graphql-tools/mock': minor
---

Query and Mutation mocks now receive the field's resolved arguments. Subscription mocks receive
the same map when resolve runs (an event is yielded); the default subscriber does not yield.

A mock is a type factory, not a resolver. The value that identifies an operation field is its
argument map after GraphQL coercion: `user(id: ID!)` always has `id`, whether the client sent a
literal or a variable. That is what you assert on (`jest.fn()` / `toHaveBeenCalledWith`) and what
you use to return the right mock.

`context` is the same request-wide object for every field (auth, loaders). It does not distinguish
`user(id: "1")` from `user(id: "2")`. Use the `resolvers` option of `addMocksToSchema` when you need
`context`, `info`, or the mock store; the rest of the fields can still come from mocks.

`mocks.Query = jest.fn(() => ({ ... }))` is called with `{ id: 'user-1' }` when `user(id:)` is
resolved. Nested type mocks such as `User` stay factories with no arguments.
