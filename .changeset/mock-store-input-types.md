---
'@graphql-tools/mock': minor
---

`MockStore` `get` and `set` now accept GraphQL input object types.

Input types were rejected as "not an object or interface", so mutation inputs could not be stored for later CRUD-style mocks. The store now treats input objects like other named object types.
