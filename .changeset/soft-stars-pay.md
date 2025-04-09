---
'@graphql-tools/load': minor
---

Throw NoTypeDefinitionsFound when cannot find files, instead of the standard Error

This helps libraries such as GraphQL Code Generator to handle loading error cases
more flexibly.
