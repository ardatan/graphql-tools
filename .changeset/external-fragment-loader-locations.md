---
'@graphql-tools/external-fragment-loader': patch
---

Honor `noLocation: false` to preserve GraphQL AST locations on external fragments. Keep locations
disabled by default and cache parsed fragments separately for each location mode.
