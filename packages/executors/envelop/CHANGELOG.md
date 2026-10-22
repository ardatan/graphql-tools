# @graphql-tools/executor-envelop

## 5.0.5

### Patch Changes

- Updated dependencies [[`501109b`](https://github.com/ardatan/graphql-tools/commit/501109b28b5b679a2f3d28a50cdaecc41624bee7)]:
  - @graphql-tools/utils@13.1.2

## 5.0.4

### Patch Changes

- Updated dependencies [[`f87bdf4`](https://github.com/ardatan/graphql-tools/commit/f87bdf4545ad2ce7e59f5e18a852069c804e18b6)]:
  - @graphql-tools/utils@13.1.1

## 5.0.3

### Patch Changes

- Updated dependencies [[`4db5750`](https://github.com/ardatan/graphql-tools/commit/4db575007172f9295e82c6d233ebd9c5dae9d6b4)]:
  - @graphql-tools/utils@13.1.0

## 5.0.2

### Patch Changes

- Updated dependencies [[`34b740b`](https://github.com/ardatan/graphql-tools/commit/34b740ba11ef58458fd077b12953d9de81221b11)]:
  - @graphql-tools/utils@13.0.2

## 5.0.1

### Patch Changes

- Updated dependencies [[`15efe55`](https://github.com/ardatan/graphql-tools/commit/15efe550f6b8d5c2073dc4ef812031397ddf3506)]:
  - @graphql-tools/utils@13.0.1

## 5.0.0

### Major Changes

- [#8515](https://github.com/ardatan/graphql-tools/pull/8515) [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8) Thanks [@ardatan](https://github.com/ardatan)! - Drop GraphQL v14/v15 support and require Node.js >= 22.18.
  
  - `graphql` peer range is now `^16.0.0 || ^17.0.0`.
  - `engines.node` is now `>=22.18.0` (Node `fs.glob` + Babel 8).
  - Dev tooling and `@graphql-tools/graphql-tag-pluck` move to Babel 8 (`@babel/core` / parser / traverse / types).
  - The standalone `cross-inspect` package is discontinued. Use `inspect` from `@graphql-tools/utils` instead (Node `util.inspect` via `process.getBuiltinModule`, with a small `JSON.stringify` / `String` fallback).
  
  ### Removed `@graphql-tools/utils` exports
  
  | Removed | Use instead |
  | --- | --- |
  | `getArgumentValues` | `import { getArgumentValues } from 'graphql'` |
  | `coerceInputs` / `graphqlJSCompat` | graphql@16+ APIs (`getArgumentValues`, etc.) |
  | `createDeferred` / `createDeferredPromise` | `const { promise, resolve, reject } = Promise.withResolvers()` |
  | `createGraphQLError` | `new GraphQLError(message, options)` from `graphql` |
  | `mapMaybePromise` | `handleMaybePromise` from `@whatwg-node/promise-helpers` |
  | `isPromise` / `fakePromise` / `mapAsyncIterator` / `MaybePromise` | `@whatwg-node/promise-helpers` |
  | `registerAbortSignalListener` / `getAbortPromise` | `AbortSignal` APIs (`throwIfAborted`, `addEventListener('abort', …, { once: true })`, `AbortSignal.any`, …) |
  | `withCancel` / `getAsyncIterableWithCancel` / `getAsyncIteratorWithCancel` | Handle cancellation on the async iterator’s `return()` (or your transport abort path) |
  | `debugTimerStart` / `debugTimerEnd` | Your own timing / `console.time` if needed |
  | `PromiseWithResolvers` (type) | Built-in `PromiseWithResolvers<T>` / return type of `Promise.withResolvers()` |
  
  `inspect` and the WeakMap `memoize1`…`memoize2of5` helpers remain on `@graphql-tools/utils` (inspect is no longer re-exported from `cross-inspect`).
  
  ### File matching (`globby` → `fs.glob`)
  
  Loaders and `@graphql-tools/load-files` now use Node’s `fs.glob` through:
  
  ```ts
  import { matchFiles, matchFilesSync } from '@graphql-tools/load-files';
  ```
  
  Directory symlinks are followed for recursive (`**`) patterns:
  
  - On Node.js ≥26.1 (and ≥24.16 where backported), `fs.glob` `followSymlinks` is used.
  - On older engines, symlink directories are discovered only under each pattern’s literal prefix (not the whole `cwd`) and patterns are re-rooted.
  - Non-recursive / literal patterns skip the symlink walk entirely.
  
  `@graphql-tools/executor` hot-path caches (`collectSubfields`, argument coercion, `@stream` detection) use `memoize2` / `memoize3` from utils. `collectSubFields` in utils stays unmemoized so the executor can own a single memoize3 layer.
  
  ### Errors and other cleanup
  
  - Prefer `new GraphQLError(message, options)` from `graphql`. Experimental schema `coordinate` support remains on `locatedError` / `relocatedError` / `getSchemaCoordinate`.
  - Removed GraphQL versions older than 16 compatibility branches (error construction, validation rule name suffixes, `URL.canParse` fallback).
  - Promise helpers should be imported from `@whatwg-node/promise-helpers` (`handleMaybePromise`, `isPromise`, `fakePromise`, `mapAsyncIterator`, `MaybePromise`) rather than re-exported from utils.

### Patch Changes

- [#8515](https://github.com/ardatan/graphql-tools/pull/8515) [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
    - Added dependency [`@whatwg-node/promise-helpers@^2.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/2.0.0) (to `dependencies`)
- Updated dependencies [[`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8)]:
  - @graphql-tools/utils@13.0.0

## 4.0.18

### Patch Changes

- [#8445](https://github.com/ardatan/graphql-tools/pull/8445) [`82457d1`](https://github.com/ardatan/graphql-tools/commit/82457d1f5ba4b4fa7ec475e9cc3713a0b2b139e8) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
    - Updated dependency [`@graphql-tools/utils@^12.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.4) (from `^12.0.3`, in `dependencies`)
- Updated dependencies [[`98673c3`](https://github.com/ardatan/graphql-tools/commit/98673c3531ce0a1b5f5f89e99b3554da5581418d), [`a75d725`](https://github.com/ardatan/graphql-tools/commit/a75d72530f07f6162b45a5627964188cac4cea8b), [`82457d1`](https://github.com/ardatan/graphql-tools/commit/82457d1f5ba4b4fa7ec475e9cc3713a0b2b139e8)]:
  - @graphql-tools/utils@12.1.0

## 4.0.17

### Patch Changes

- Updated dependencies [[`fd95dc9`](https://github.com/ardatan/graphql-tools/commit/fd95dc9c2211ab91d142d58044a80b5f40835b70)]:
  - @graphql-tools/utils@12.0.4

## 4.0.16

### Patch Changes

- Updated dependencies [[`19f5b33`](https://github.com/ardatan/graphql-tools/commit/19f5b3373fd7ace0688d19950fc529ce8347952a)]:
  - @graphql-tools/utils@12.0.3

## 4.0.15

### Patch Changes

- Updated dependencies [[`b1fbba2`](https://github.com/ardatan/graphql-tools/commit/b1fbba2c52ce6b6d6f0aa92b927654d3eeaa0a8d), [`20d36a5`](https://github.com/ardatan/graphql-tools/commit/20d36a5c6eb8fd5524420988e01a48618c450d70)]:
  - @graphql-tools/utils@12.0.2

## 4.0.14

### Patch Changes

- Updated dependencies [[`60db079`](https://github.com/ardatan/graphql-tools/commit/60db079ef847a3a6cfad6053fee2c8f4021b43aa), [`57e316d`](https://github.com/ardatan/graphql-tools/commit/57e316d1ee21668761d6b8ad7692e494db8ffab4), [`1c1c5a0`](https://github.com/ardatan/graphql-tools/commit/1c1c5a02931d3e444401beef6d6765054d29369d), [`1c1c5a0`](https://github.com/ardatan/graphql-tools/commit/1c1c5a02931d3e444401beef6d6765054d29369d), [`0b9529f`](https://github.com/ardatan/graphql-tools/commit/0b9529f1988fd36186a7c106a6efe0356f1b7f2e)]:
  - @graphql-tools/utils@12.0.1

## 4.0.13

### Patch Changes

- Updated dependencies
  [[`2273c21`](https://github.com/ardatan/graphql-tools/commit/2273c21960fa12b59f7793c01ee024b1cef002e6)]:
  - @graphql-tools/utils@12.0.0

## 4.0.12

### Patch Changes

- Updated dependencies
  [[`e90719b`](https://github.com/ardatan/graphql-tools/commit/e90719baf08bf1aa7b372759dd197ac27e71dc64)]:
  - @graphql-tools/utils@11.2.2

## 4.0.11

### Patch Changes

- Updated dependencies
  [[`615c1a2`](https://github.com/ardatan/graphql-tools/commit/615c1a27f2a379eac74127815effc8e062bdc47c)]:
  - @graphql-tools/utils@11.2.1

## 4.0.10

### Patch Changes

- Updated dependencies
  [[`2609c94`](https://github.com/ardatan/graphql-tools/commit/2609c94954bff598f0d38aac629a2ec955adbc44)]:
  - @graphql-tools/utils@11.2.0

## 4.0.9

### Patch Changes

- Updated dependencies
  [[`981d461`](https://github.com/ardatan/graphql-tools/commit/981d4618e16c2697a19c96b55d5f84186079f63d)]:
  - @graphql-tools/utils@11.1.1

## 4.0.8

### Patch Changes

- Updated dependencies
  [[`a4b7dce`](https://github.com/ardatan/graphql-tools/commit/a4b7dceaeec9561bf77b8a0804774b604b97b060)]:
  - @graphql-tools/utils@11.1.0

## 4.0.7

### Patch Changes

- Updated dependencies
  [[`ae36a0e`](https://github.com/ardatan/graphql-tools/commit/ae36a0ebc2464665d5be13d167485bf173d96313)]:
  - @graphql-tools/utils@11.0.1

## 4.0.6

### Patch Changes

- Updated dependencies
  [[`6f3776c`](https://github.com/ardatan/graphql-tools/commit/6f3776c06e80aa6b793be9742e9b2453f8746276)]:
  - @graphql-tools/utils@11.0.0

## 4.0.5

### Patch Changes

- Updated dependencies
  [[`2118a80`](https://github.com/ardatan/graphql-tools/commit/2118a80e2658076745ef314fc10e2030d7148394)]:
  - @graphql-tools/utils@10.11.0

## 4.0.4

### Patch Changes

- Updated dependencies
  [[`2fe123a`](https://github.com/ardatan/graphql-tools/commit/2fe123aedaa9f996cd30bbffa43dcba864c13bc9)]:
  - @graphql-tools/utils@10.10.3

## 4.0.3

### Patch Changes

- Updated dependencies
  [[`dddc5f6`](https://github.com/ardatan/graphql-tools/commit/dddc5f6cc5fa3208dc14a850e25a183b797a5f71)]:
  - @graphql-tools/utils@10.10.2

## 4.0.2

### Patch Changes

- Updated dependencies
  [[`fbb58b5`](https://github.com/ardatan/graphql-tools/commit/fbb58b51c4993ba9680ce6c2ef7203ab3a142713)]:
  - @graphql-tools/utils@10.10.1

## 4.0.1

### Patch Changes

- Updated dependencies
  [[`fd105f4`](https://github.com/ardatan/graphql-tools/commit/fd105f4e3a81a32050b5a104d1040ffbb86c6ff5),
  [`fded91e`](https://github.com/ardatan/graphql-tools/commit/fded91e34c19cabdcca1bc49146fda1b8fd5661c),
  [`3b99a9b`](https://github.com/ardatan/graphql-tools/commit/3b99a9b6c6f190b2108dc6571bb64a7c3319edd6)]:
  - @graphql-tools/utils@10.10.0

## 4.0.0

### Major Changes

- [#7449](https://github.com/ardatan/graphql-tools/pull/7449)
  [`97e5e18`](https://github.com/ardatan/graphql-tools/commit/97e5e18201b1a67c67e2c78358ba94ea788f123b)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/wrap@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/11.0.0)
    (from `^10.0.16`, in `dependencies`)

## 3.0.29

### Patch Changes

- Updated dependencies
  [[`32d0457`](https://github.com/ardatan/graphql-tools/commit/32d0457f3fae53b408bd8de459bf4541fcc14a23)]:
  - @graphql-tools/utils@10.9.1

## 3.0.28

### Patch Changes

- Updated dependencies
  [[`22af985`](https://github.com/ardatan/graphql-tools/commit/22af98581e983079ec7e53677b905d3d03117524),
  [`53db005`](https://github.com/ardatan/graphql-tools/commit/53db00540c2549748afdeeb65bb45a6c45ce57d3)]:
  - @graphql-tools/utils@10.9.0

## 3.0.27

### Patch Changes

- Updated dependencies
  [[`d123e26`](https://github.com/ardatan/graphql-tools/commit/d123e26b30b4febbbe1780bd32773b60e614dbf0)]:
  - @graphql-tools/utils@10.8.6

## 3.0.26

### Patch Changes

- Updated dependencies
  [[`90a717e`](https://github.com/ardatan/graphql-tools/commit/90a717e35a7e4e51da4fe747cb73544f24698fb7),
  [`26518de`](https://github.com/ardatan/graphql-tools/commit/26518debfcb668e8feb5fb146271a13da92b778a)]:
  - @graphql-tools/utils@10.8.5

## 3.0.25

### Patch Changes

- [#7001](https://github.com/ardatan/graphql-tools/pull/7001)
  [`746358f`](https://github.com/ardatan/graphql-tools/commit/746358f68e81c9a3cf1ccf4b1a599ae6eae404ca)
  Thanks [@renovate](https://github.com/apps/renovate)! - Improve logging the warning about
  introspection failure

## 3.0.24

### Patch Changes

- Updated dependencies
  [[`155944b`](https://github.com/ardatan/graphql-tools/commit/155944b11e7ff1d8816ba3e9a4e4aa035c81f645)]:
  - @graphql-tools/utils@10.8.4

## 3.0.23

### Patch Changes

- Updated dependencies
  [[`4a2eb14`](https://github.com/ardatan/graphql-tools/commit/4a2eb14d0e3394d3dfbb3d83856500c5fb548285)]:
  - @graphql-tools/utils@10.8.3

## 3.0.22

### Patch Changes

- Updated dependencies
  [[`3547bba`](https://github.com/ardatan/graphql-tools/commit/3547bbadd3ad4fa01a950fd685345f7c9c934e2f)]:
  - @graphql-tools/utils@10.8.2

## 3.0.21

### Patch Changes

- Updated dependencies
  [[`651a5dc`](https://github.com/ardatan/graphql-tools/commit/651a5dccb466b04f7fd16561cd264acd306e0711)]:
  - @graphql-tools/utils@10.8.1

## 3.0.20

### Patch Changes

- Updated dependencies
  [[`0a3e193`](https://github.com/ardatan/graphql-tools/commit/0a3e193e1ed70bd744375bfb4a10e515ecf59019),
  [`357b2ee`](https://github.com/ardatan/graphql-tools/commit/357b2ee6eef5e1f3b2b067728e9b167b1c2f82e5)]:
  - @graphql-tools/utils@10.8.0

## 3.0.19

### Patch Changes

- Updated dependencies
  [[`53bb601`](https://github.com/ardatan/graphql-tools/commit/53bb60104782738f51a2c2de42d6da7aba191537),
  [`53bb601`](https://github.com/ardatan/graphql-tools/commit/53bb60104782738f51a2c2de42d6da7aba191537)]:
  - @graphql-tools/utils@10.7.2

## 3.0.18

### Patch Changes

- Updated dependencies
  [[`4912f19`](https://github.com/ardatan/graphql-tools/commit/4912f19b290a06c603b00e268d49abebddc3fd6d)]:
  - @graphql-tools/utils@10.7.1

## 3.0.17

### Patch Changes

- Updated dependencies
  [[`2c70d27`](https://github.com/ardatan/graphql-tools/commit/2c70d276c510be18f7ce9e966c4653ff3c9b2641)]:
  - @graphql-tools/utils@10.7.0

## 3.0.16

### Patch Changes

- Updated dependencies
  [[`6a8123b`](https://github.com/ardatan/graphql-tools/commit/6a8123be34d3270e4e6a628c7b4ef35fa66f52a1)]:
  - @graphql-tools/utils@10.6.4

## 3.0.15

### Patch Changes

- Updated dependencies
  [[`020b9e4`](https://github.com/ardatan/graphql-tools/commit/020b9e47b51f9847bf915de5faefe09dc04d9612)]:
  - @graphql-tools/utils@10.6.3

## 3.0.14

### Patch Changes

- [#6662](https://github.com/ardatan/graphql-tools/pull/6662)
  [`696a0d5`](https://github.com/ardatan/graphql-tools/commit/696a0d5ac9232baebe730226fe9ea9d6e3b98679)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.6.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.1)
    (from `^10.6.0`, in `dependencies`)
- Updated dependencies
  [[`1b24656`](https://github.com/ardatan/graphql-tools/commit/1b24656d3d13274820e52bede56991b0c54e8060)]:
  - @graphql-tools/utils@10.6.2

## 3.0.13

### Patch Changes

- Updated dependencies
  [[`1e02935`](https://github.com/ardatan/graphql-tools/commit/1e0293562961fb12b267235e5aa6d0e83d0e7d0f)]:
  - @graphql-tools/utils@10.6.1

## 3.0.12

### Patch Changes

- Updated dependencies
  [[`414e404`](https://github.com/ardatan/graphql-tools/commit/414e404a06478ea8ddd1065bd765de14af0f6c43)]:
  - @graphql-tools/utils@10.6.0

## 3.0.11

### Patch Changes

- Updated dependencies
  [[`dc5043b`](https://github.com/ardatan/graphql-tools/commit/dc5043bb7c9afaca907c242eb6bf65e8019d79c4)]:
  - @graphql-tools/utils@10.5.6
  - @graphql-tools/wrap@10.0.16

## 3.0.10

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.15

## 3.0.9

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.14

## 3.0.8

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.13

## 3.0.7

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.12

## 3.0.6

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.11

## 3.0.5

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.10

## 3.0.4

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.9

## 3.0.3

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.8

## 3.0.2

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/wrap@10.0.7

## 3.0.1

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5
  - @graphql-tools/wrap@10.0.6

## 3.0.0

### Major Changes

- [#6227](https://github.com/ardatan/graphql-tools/pull/6227)
  [`85c383f`](https://github.com/ardatan/graphql-tools/commit/85c383fbb44eeb2a0509480d84ca0b12811bc3ca)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: `invalidateSupergraph` is now replaced
  with `invalidateUnifiedGraph`

## 2.0.4

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.1)
    (from `^10.0.0`, in `dependencies`)
- Updated dependencies
  [[`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)]:
  - @graphql-tools/wrap@10.0.2

## 2.0.3

### Patch Changes

- [`b798b3b`](https://github.com/ardatan/graphql-tools/commit/b798b3b0a54f634bf2dd2275ef47f5263a5ce238)
  Thanks [@ardatan](https://github.com/ardatan)! - Skip validation if the schema is not provided

- [`b798b3b`](https://github.com/ardatan/graphql-tools/commit/b798b3b0a54f634bf2dd2275ef47f5263a5ce238)
  Thanks [@ardatan](https://github.com/ardatan)! - Move schema introspection logic to Envelop

## 2.0.2

### Patch Changes

- [#5636](https://github.com/ardatan/graphql-tools/pull/5636)
  [`ab3f9b4b`](https://github.com/ardatan/graphql-tools/commit/ab3f9b4bec3b71af560ddc77a7869384ec3e4c7a)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^3.0.4 || ^4.0.0 || ^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.4)
    (from `^3.0.4 || ^4.0.0`, in `peerDependencies`)

## 2.0.1

### Patch Changes

- [#5297](https://github.com/ardatan/graphql-tools/pull/5297)
  [`28c58ae8`](https://github.com/ardatan/graphql-tools/commit/28c58ae8cb194c64f66d162d9fa0284496a02b43)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^3.0.4 || ^4.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.4) (from
    `^3.0.4`, in `peerDependencies`)

## 2.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 1.0.0

### Major Changes

- [`e0437e1b`](https://github.com/ardatan/graphql-tools/commit/e0437e1b49f11e25d814fd2ad0ec663681da1702)
  Thanks [@ardatan](https://github.com/ardatan)! - New plugin for Envelop
