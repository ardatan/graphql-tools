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
- Engines require `node: >=22.0.0`.
- CI test matrix: Node 22/24 × GraphQL 16/17.

### Removed exports and replacements

| Removed from `@graphql-tools/utils` | Replacement |
| --- | --- |
| `getArgumentValues` | `import { getArgumentValues } from 'graphql'` |
| `coerceInputs` (internal fork) | `graphql`'s input coercion / `getArgumentValues` |
| `graphqlJSCompat` helpers | Dropped; use graphql@16+ APIs directly |
| `createDeferred` / `createDeferredPromise` | `const { promise, resolve, reject } = Promise.withResolvers()` |
| `memoize4` | `memoizee(fn, { length: 4, normalizer })` (or keep using remaining `memoize*` compat exports where applicable) |
| `memoize2of5` | `memoizee(fn, { length: 2, normalizer })` — cache on the first two args |

`matchFiles` / `matchFilesSync` were never a stable utils public API in prior releases as a globby replacement; file matching is now:

```ts
import { matchFiles, matchFilesSync } from '@graphql-tools/load-files';
```

Do not import them from `@graphql-tools/utils`. Loader packages that previously depended on `globby` should use these helpers (or Node's `fs.glob` / `fs.globSync` directly on Node 22+).

### Memoization

Custom WeakMap `memoize*` implementations are gone. Prefer the `memoizee` package:

```ts
import memoizee from 'memoizee';
import weakMemoizee from 'memoizee/weak.js';

// single object-identity arg
const memoized = weakMemoizee((schema: GraphQLSchema) => /* ... */);

// multi-arg with identity keys
const memoized2 = memoizee(fn, {
  length: 2,
  normalizer: (args) => objectKey(args[0]) + '|' + objectKey(args[1]),
});
```

Compatibility exports still available (thin `memoizee` wrappers, mainly for gateway packages): `memoize1`, `memoize2`, `memoize3`, `memoize5`, `memoize2of4`. New code should import `memoizee` directly.

### Errors

Prefer `new GraphQLError(message, options)` from `graphql`. `createGraphQLError` remains only for the experimental `coordinate` field and coercing GraphQLError-like plain objects used as `originalError`.

### Other cleanup

- Removed GraphQL <16 branches (error construction, validation rule name suffixes, `URL.canParse` fallback).
- Root `globby` usage in `scripts/build-api-docs.mts` replaced with `fs.globSync`.
