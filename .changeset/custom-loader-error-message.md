---
'@graphql-tools/load': patch
---

`useCustomLoader` and `useCustomLoaderSync` now include the original load failure in the thrown error message.

A missing, broken, or non-function custom loader used to throw only:

```
Failed to load custom loader: ./codegen-loader.js
```

The underlying `SyntaxError`, `Cannot find module`, or "did not export a function" was swallowed, so codegen and `loadDocuments` could not show why the file failed.

```js
// broken-loader.js
module.exports = function ( {
```

```ts
await useCustomLoader('./broken-loader.js', cwd);
```

```
Failed to load custom loader: ./broken-loader.js
SyntaxError: Unexpected token '{'
```

`getCustomLoaderByPath` still returns `null` when the file cannot be loaded.
