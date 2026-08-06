---
'@graphql-tools/merge': patch
---

Pass the collected directive definitions to `mergeSchemaDefs` so repeatable directives on `schema` definitions and `extend schema` extensions (e.g. a repeatable `@link`) are kept as separate instances instead of being collapsed and having their arguments merged.
