---
'@graphql-tools/utils': patch
'@graphql-tools/executor': patch
---

Cache `collectFields` / `collectSubfields` across executions when the document has no variable-conditional `@skip`, `@include`, or `@defer`, so `variableValues` are omitted from the cache key for those documents.
