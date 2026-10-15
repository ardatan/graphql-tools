---
'@graphql-tools/utils': patch
'@graphql-tools/executor': patch
---

On GraphQL 17, use graphql-js `getArgumentValues` when exported (via namespace lookup) and pass executor variable sources through so argument defaults and nested variables match upstream.
