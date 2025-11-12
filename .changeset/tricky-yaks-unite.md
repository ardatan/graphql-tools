---
'@graphql-tools/utils': patch
---

Revert https://github.com/ardatan/graphql-tools/pull/7683 which can cause unexpected breaking
changes so as before the schema extension node will always be converted to a schema definition node
