---
'@graphql-tools/utils': patch
---

fix `getArgumentValues` to coerce GraphQL 17 `default.literal` / `default.value` with `coerceInputLiteral` / `coerceInputValue`, including when a variable has no runtime value, matching graphql-js `execute`.
