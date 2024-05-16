---
"@graphql-tools/delegate": patch
---

Do not merge errors and regular resolved objects

If a subschema returns an error for specific field that is already resolved by another subschema, the error should not be merged with the resolved object.
