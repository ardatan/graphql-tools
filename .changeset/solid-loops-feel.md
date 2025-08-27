---
'@graphql-tools/import': patch
---

This change fixes a minor bug from #7310 that affects users of path aliases - a feature that lets GraphQL users leverage [tsconfig.json#paths](https://www.typescriptlang.org/tsconfig/#paths) aliasing syntax for GraphQL imports.

The issue stems from the original implementation's execution order. Path alias resolution happens inside `resolveFilePath`, which only runs for non-absolute paths:

```ts
  if (!isAbsolute(filePath) && !(filePath in predefinedImports)) {
    filePath = resolveFilePath(cwd, filePath, pathAliases);
  }
```

This means relative path aliases like `@/*` → `src/*` work correctly, but absolute path aliases like `/*` → `src/*` fail since they never reach the resolution logic.

The solution is straightforward: move path alias resolution before the absolute path check instead of after it.
