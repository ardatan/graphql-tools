---
'@graphql-tools/utils': patch
'@graphql-tools/executor': patch
---

fix `getArgumentValues` to coerce GraphQL 17 `default.literal` / `default.value` with `coerceInputLiteral` / `coerceInputValue`, including when a variable has no runtime value, and pass executor variable sources through so nested variables keep their declared types.
