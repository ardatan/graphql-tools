---
'@graphql-tools/webpack-loader': patch
'@graphql-tools/webpack-loader-runtime': patch
---

With `esModule: true`, `#import` of another `.graphql` file now uses `require(...).default`, matching the loader's `export default`. `unique()` also treats a missing `definitions` array as empty so unused imports do not throw.
