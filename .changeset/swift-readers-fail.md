---
'@graphql-tools/import': patch
---

Avoid importing `process` and use it from `globalThis`.
In some cases, `cwd` is not exported with this name in the environment in ESM scope.
