---
'@graphql-tools/utils': patch
'@graphql-tools/executor': patch
---

On GraphQL 17+, delegate `getArgumentValues` to graphql-js and pass executor variable sources through so argument defaults and nested variables match upstream coercion.
