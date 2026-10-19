---
'@graphql-tools/executor': major
---

BREAKING: stop exporting `getVariableValues` from `@graphql-tools/executor`. Use `graphql`'s `getVariableValues` instead.

Execution now calls graphql-js directly for variable coercion (including GraphQL 17 SDL input-field defaults on omitted variables). The maintained fork and helpers (`values.ts`, `validateInputValue`, etc.) were removed.
