---
'@graphql-tools/utils': patch
---

Preserve enum (unquoted) directive argument values in `printSchemaWithDirectives` instead of converting them to strings. Fixes #8557.
