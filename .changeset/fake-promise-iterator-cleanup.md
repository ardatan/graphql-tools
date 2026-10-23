---
'@graphql-tools/executor': patch
'@graphql-tools/mock': patch
---

Use `fakePromise` / `fakeRejectPromise` for iterator `return` / `throw` / `asyncDispose` instead of unnecessary `async`
