---
"@graphql-tools/utils": minor
"@graphql-tools/merge": patch
"@graphql-tools/schema": patch
---

**Fix:** Preserve symbol-keyed GraphQL extensions when building, merging, or extracting schemas.

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

// Before: only string keys survived
// schema.extensions === { tagged: true }

// After: symbol keys are preserved
// schema.extensions[META] === { source: 'app' }
// schema.extensions.tagged === true
```

Schema extension merge/extract and resolver merging always enable `{ enumerable: true, nonEnumerable: true }` so symbol keys survive in tools' own merge/extract paths on every supported GraphQL.js major. (GraphQL.js itself may still drop symbol keys from field configs below v17 when rebuilding types.)

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

Resolver map types (`IResolvers` / field resolver `extensions` and type `__extensions`) now use `ExtensionsObject` (`Record<string | symbol, any>`), so symbol-keyed resolver extensions type-check under GraphQL.js v17+.
