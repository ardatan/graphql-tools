---
"@graphql-tools/federation": patch
---

If two different subschemas have the root field, use the same field to resolve missing fields instead of applying a type merging in advance
