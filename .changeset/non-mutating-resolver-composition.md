---
'@graphql-tools/resolvers-composition': patch
---

`composeResolvers` now returns composed resolvers without modifying the caller's resolver object, allowing the original resolvers to be reused independently.
