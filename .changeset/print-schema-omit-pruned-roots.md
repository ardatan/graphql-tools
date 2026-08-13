---
'@graphql-tools/utils': patch
---

Omit mutation/subscription from `printSchemaWithDirectives` when those root types are no longer present on the schema (e.g. after `pruneSchema`).
