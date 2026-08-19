---
'@graphql-tools/load': patch
---

Load custom schema/document loaders with `import()` after `createRequire`, so ESM loader files and packages work with async `load` (including graphql-codegen). Closes #6656.
