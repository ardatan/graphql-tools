---
'@graphql-tools/mock': minor
---

Query, Mutation, and Subscription mocks now receive the operation's variable values.

`mocks.Query = jest.fn(() => ({ ... }))` is called with `{ userId: '...' }`, so `mock.calls` can assert the request variables the way v7 did. Operation field functions get `(fieldArgs, variables)`. Nested type mocks such as `User` are unchanged.
