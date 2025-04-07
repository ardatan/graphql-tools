---
'@graphql-tools/load': minor
---

Throw NoDocumentFoundError when cannot find documents instead of the standard Error

This helps libraries such as GraphQL Code Generator to handle loading error cases
more flexibly.
