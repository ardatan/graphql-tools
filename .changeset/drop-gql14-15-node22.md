---
'cross-inspect': major
'graphql-tools': major
'@graphql-tools/apollo-engine-loader': major
'@graphql-tools/code-file-loader': major
'@graphql-tools/documents': major
'@graphql-tools/executor': major
'@graphql-tools/executor-apollo-link': major
'@graphql-tools/executor-envelop': major
'@graphql-tools/executor-legacy-ws': major
'@graphql-tools/executor-urql-exchange': major
'@graphql-tools/executor-yoga': major
'@graphql-tools/external-fragment-loader': major
'@graphql-tools/github-loader': major
'@graphql-tools/git-loader': major
'@graphql-tools/graphql-file-loader': major
'@graphql-tools/graphql-tag-pluck': major
'@graphql-tools/import': major
'@graphql-tools/jest-transform': major
'@graphql-tools/json-file-loader': major
'@graphql-tools/links': major
'@graphql-tools/load': major
'@graphql-tools/load-files': major
'@graphql-tools/merge': major
'@graphql-tools/mock': major
'@graphql-tools/module-loader': major
'@graphql-tools/node-require': major
'@graphql-tools/optimize': major
'@graphql-tools/relay-operation-optimizer': major
'@graphql-tools/resolvers-composition': major
'@graphql-tools/schema': major
'@graphql-tools/url-loader': major
'@graphql-tools/utils': major
'@graphql-tools/webpack-loader': major
'@graphql-tools/webpack-loader-runtime': major
---

Drop GraphQL v14/v15 and require Node.js >= 22.

- Peer dependency on `graphql` is now `^16.0.0 || ^17.0.0`.
- Engines require `node: >=22.14.0` (needed for `fs.glob` string-array `exclude` / `withFileTypes`).
- CI test matrix: Node 22/24 × GraphQL 16/17.

### Removed exports and replacements

| Removed from `@graphql-tools/utils` | Replacement |
| --- | --- |
| `getArgumentValues` | `import { getArgumentValues } from 'graphql'` |
| `coerceInputs` / `graphqlJSCompat` | graphql@16+ APIs (`getArgumentValues`, etc.) |
| `createDeferred` / `createDeferredPromise` | `const { promise, resolve, reject } = Promise.withResolvers()` |
| `createGraphQLError` | `new GraphQLError(message, options)` from `graphql` |
| `memoize1` / `memoize2` / `memoize3` / `memoize4` / `memoize5` / `memoize2of4` / `memoize2of5` | `memoizee` / `memoizee/weak.js` (see below) |

File matching (replaces `globby` in loaders):

```ts
import { matchFiles, matchFilesSync } from '@graphql-tools/load-files';
```

### Memoization

All `memoize*` helpers were removed from `@graphql-tools/utils`. Use `memoizee/weak.js` for object-identity caching (and nest for multiple object args):

```ts
import weakMemoizee from 'memoizee/weak.js';

// single object-identity argument
const bySchema = weakMemoizee((schema: GraphQLSchema) => /* ... */);

// multi-arg: nest weakMemoizee (true WeakMap GC; no custom key normalizer)
const byTwoMemo = weakMemoizee((a: A) => weakMemoizee((b: B) => fn(a, b)));
const byTwo = (a: A, b: B) => byTwoMemo(a)(b);

// cache on first two args only (former memoize2of4 / memoize2of5)
const byFirstTwoMemo = weakMemoizee((a: A) => weakMemoizee((b: B) => fn(a, b, c, d)));
const byFirstTwoOfFour = (a: A, b: B, _c: C, _d: D) => byFirstTwoMemo(a)(b);
```

For primitive-key caches, use `memoizee` with `{ primitive: true }` instead.

### Errors

`createGraphQLError` was removed. Use `new GraphQLError(message, options)` from `graphql`. Experimental schema `coordinate` support remains on `locatedError` / `relocatedError` / `getSchemaCoordinate`.

### Other cleanup

- Removed GraphQL <16 branches (error construction, validation rule name suffixes, `URL.canParse` fallback).
- Root `globby` usage in `scripts/build-api-docs.mts` replaced with `fs.globSync`.
