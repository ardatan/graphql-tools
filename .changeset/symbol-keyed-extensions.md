---
"@graphql-tools/utils": minor
"@graphql-tools/merge": patch
"@graphql-tools/schema": patch
---

**Fix:** Preserve symbol-keyed GraphQL extensions on GraphQL.js v17+ when building, merging, or extracting schemas.

GraphQL.js v17 allows `string | symbol` keys on schema/type/field `extensions` (via `toObjMapWithSymbols`). `@graphql-tools` was dropping those symbol keys in two places:

1. `mergeDeep` only walked enumerable **string** keys (`for...in`), so symbol extensions were lost when applying `schemaExtensions`.
2. `extractExtensionsFromSchema` did not copy **non-enumerable** own symbol keys (enumerable symbols already survive object rest/spread; the explicit loop covers the non-enumerable case).

### Example (bug)

```ts
import { makeExecutableSchema } from '@graphql-tools/schema'

const META = Symbol('META')

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String
    }
  `,
  schemaExtensions: {
    schemaExtensions: {
      [META]: { source: 'app' },
      tagged: true,
    },
    types: {},
  },
})

// Before (v17): only string keys survived
// schema.extensions === { tagged: true }

// After (v17): symbol keys are preserved
// schema.extensions[META] === { source: 'app' }
// schema.extensions.tagged === true
```

On GraphQL.js below v17, behavior is unchanged (GraphQL itself does not keep symbol extension keys).

### `mergeDeep` API

`mergeDeep` now accepts an **options object**. The old positional boolean arguments still work but are **deprecated**.

```ts
import { mergeDeep } from '@graphql-tools/utils'

// Deprecated (still supported)
mergeDeep([a, b], false, true, false, true)
//                ^proto ^arrays ^len  ^non-enumerable symbols only

// Preferred
mergeDeep([a, b], {
  respectPrototype: false,
  respectArrays: true,
  respectArrayLength: false,
  respectSymbols: {
    enumerable: true, // merge `obj[sym] = value` keys
    nonEnumerable: true, // copy defineProperty(..., { enumerable: false }) symbols
  },
})
```

`respectSymbols` defaults to `{ enumerable: false, nonEnumerable: false }` (symbols dropped), matching the historical default. The legacy 5th positional flag still maps to `{ nonEnumerable: true }` only.

Schema extension merge/extract and resolver merging enable `{ enumerable: true, nonEnumerable: true }` automatically when `graphql` major >= 17.
