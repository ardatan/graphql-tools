---
'@graphql-tools/utils': patch
'@graphql-tools/executor': patch
---

Fix GraphQL 17 argument defaults in `getArgumentValues` (`default.literal` / `default.value`, missing variables) and pass executor variable sources through for nested literal coercion.
