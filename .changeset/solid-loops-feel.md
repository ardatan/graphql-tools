---
'@graphql-tools/import': patch
---

Fix support for absolute path aliases in GraphQL imports

Path aliases configured with absolute paths (e.g., `/*` → `src/*`) now work correctly alongside relative aliases (e.g., `@/*` → `src/*`). This allows more flexible aliasing configurations when using [tsconfig.json#paths](https://www.typescriptlang.org/tsconfig/#paths) syntax for GraphQL imports.
