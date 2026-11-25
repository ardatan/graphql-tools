---
'@graphql-tools/merge': patch
---

Fix `mergeTypeDefs` dropping an interface's `implements` clause when it is extended by an `extend interface` block that doesn't redeclare `implements`.
