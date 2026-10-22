---
'@graphql-tools/mock': minor
---

Query, Mutation, and Subscription mocks now receive the field's resolved arguments.

`mocks.Query = jest.fn(() => ({ ... }))` is called with `{ id: 'user-1' }` when `user(id:)` is resolved. Nested type mocks such as `User` are unchanged.
