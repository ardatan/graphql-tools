---
'@graphql-tools/mock': minor
---

Query, Mutation, and Subscription mocks now receive the field's resolved arguments.

`mocks.Query = jest.fn(() => ({ ... }))` is called with `{ id: 'user-1' }` even when the client named the variable `$userId`. Assert schema argument names, not operation variable names. Nested type mocks such as `User` are unchanged.
