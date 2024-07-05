# @graphql-tools/executor-http

## 1.1.0

### Minor Changes

- [#6323](https://github.com/ardatan/graphql-tools/pull/6323)
  [`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement Symbol.dispose or Symbol.asyncDispose
  to make \`Executor\`s \`Disposable\`

### Patch Changes

- Updated dependencies
  [[`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)]:
  - @graphql-tools/utils@10.3.0

## 1.0.9

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.2`, in `dependencies`)

## 1.0.8

### Patch Changes

- [#5902](https://github.com/ardatan/graphql-tools/pull/5902)
  [`9d18cce`](https://github.com/ardatan/graphql-tools/commit/9d18ccedac0a288080cbe1c9323ed838cbc4174e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Error when both data and errors fields are
  empty

## 1.0.7

### Patch Changes

- [#5825](https://github.com/ardatan/graphql-tools/pull/5825)
  [`12b578e`](https://github.com/ardatan/graphql-tools/commit/12b578e260c3011346d4af1cf71abd70f40569fe)
  Thanks [@felamaslen](https://github.com/felamaslen)! - Fixed http executor to allow custom
  content-type header

## 1.0.6

### Patch Changes

- [`b798b3b`](https://github.com/ardatan/graphql-tools/commit/b798b3b0a54f634bf2dd2275ef47f5263a5ce238)
  Thanks [@ardatan](https://github.com/ardatan)! - Memoize the print result automatically, and able
  to accept a custom print function

## 1.0.5

### Patch Changes

- [`a4463d3`](https://github.com/ardatan/graphql-tools/commit/a4463d3607f33b176828bc48b6895adf3120aeec)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove headers from extensions in the GraphQL
  request

## 1.0.4

### Patch Changes

- [#5724](https://github.com/ardatan/graphql-tools/pull/5724)
  [`cfbd2e07`](https://github.com/ardatan/graphql-tools/commit/cfbd2e07aff0c773a2e2766ea5fd34b628e72f1f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle chunked and no-space messages in SSE

## 1.0.3

### Patch Changes

- [`fb5f9ae3`](https://github.com/ardatan/graphql-tools/commit/fb5f9ae3bac4710b86bdad4a86bf7a4c7b8eb6e6)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect \`method\` for SSE subscriptions

## 1.0.2

### Patch Changes

- [`5c174cc9`](https://github.com/ardatan/graphql-tools/commit/5c174cc9aa2d3f623df084f276fe345f30e57928)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid object spread for better performance in
  Node

## 1.0.1

### Patch Changes

- [#5396](https://github.com/ardatan/graphql-tools/pull/5396)
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency [`dset@^3.1.2` ↗︎](https://www.npmjs.com/package/dset/v/3.1.2) (from
    `dependencies`)

- [#5396](https://github.com/ardatan/graphql-tools/pull/5396)
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)
  Thanks [@ardatan](https://github.com/ardatan)! - Move the merging logic of incremental results to
  the utils package

- Updated dependencies
  [[`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c),
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)]:
  - @graphql-tools/utils@10.0.2

## 1.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.0)
    (from `^0.8.1`, in `dependencies`)
- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 0.1.10

### Patch Changes

- [`05fd1fd4`](https://github.com/ardatan/graphql-tools/commit/05fd1fd4cc788e6ac19402d3158e3e5386a92894)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid passing sensitive data through errors

## 0.1.9

### Patch Changes

- [#5061](https://github.com/ardatan/graphql-tools/pull/5061)
  [`42c4a8da`](https://github.com/ardatan/graphql-tools/commit/42c4a8da2626bc7c39244712bb79550671b62a72)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle unexpected non-json responses

## 0.1.8

### Patch Changes

- [#5050](https://github.com/ardatan/graphql-tools/pull/5050)
  [`26f6d221`](https://github.com/ardatan/graphql-tools/commit/26f6d221daac51e8eccbba3780047cf8b8304e4e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.1)
    (from `^0.8.0`, in `dependencies`)

## 0.1.7

### Patch Changes

- [#5041](https://github.com/ardatan/graphql-tools/pull/5041)
  [`1b948acc`](https://github.com/ardatan/graphql-tools/commit/1b948accf76366f45f69fe212e0d600a85eb6a89)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.0)
    (from `^0.7.0`, in `dependencies`)

## 0.1.6

### Patch Changes

- [#5031](https://github.com/ardatan/graphql-tools/pull/5031)
  [`ab4cf86b`](https://github.com/ardatan/graphql-tools/commit/ab4cf86bf1330deacd95ecea2fcca54dd6590da1)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.7.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.7.0)
    (from `^0.6.9`, in `dependencies`)

## 0.1.5

### Patch Changes

- [#5025](https://github.com/ardatan/graphql-tools/pull/5025)
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^9.2.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.0)
    (from `9.2.0`, in `dependencies`)
  - Updated dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.12`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.6.9` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.9)
    (from `0.6.5`, in `dependencies`)
  - Updated dependency
    [`@repeaterjs/repeater@^3.0.4` ↗︎](https://www.npmjs.com/package/@repeaterjs/repeater/v/3.0.4)
    (from `3.0.4`, in `dependencies`)
  - Updated dependency [`dset@^3.1.2` ↗︎](https://www.npmjs.com/package/dset/v/3.1.2) (from
    `3.1.2`, in `dependencies`)
  - Updated dependency [`meros@^1.2.1` ↗︎](https://www.npmjs.com/package/meros/v/1.2.1) (from
    `1.2.1`, in `dependencies`)
- Updated dependencies
  [[`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/utils@9.2.1

## 0.1.4

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0

## 0.1.3

### Patch Changes

- [`cecf4c90`](https://github.com/ardatan/graphql-tools/commit/cecf4c90dc6b0cef51bc8ef7a54205455f4d94e4)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix fetch signature

## 0.1.2

### Patch Changes

- [#5008](https://github.com/ardatan/graphql-tools/pull/5008)
  [`034b868f`](https://github.com/ardatan/graphql-tools/commit/034b868f0121de122155a5432eb5d42081493db3)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.5) (from
    `0.6.2`, in `dependencies`)

## 0.1.1

### Patch Changes

- [#4968](https://github.com/ardatan/graphql-tools/pull/4968)
  [`d9bcb5b6`](https://github.com/ardatan/graphql-tools/commit/d9bcb5b642d7e9724cc1cc6499cf6cdcfd42c102)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.2) (from
    `0.6.1`, in `dependencies`)

## 0.1.0

### Minor Changes

- [#4963](https://github.com/ardatan/graphql-tools/pull/4963)
  [`be24e9ef`](https://github.com/ardatan/graphql-tools/commit/be24e9efaaf0f159e32d8f6271275df202240ad5)
  Thanks [@ardatan](https://github.com/ardatan)! - Support factory function for headers

### Patch Changes

- [#4963](https://github.com/ardatan/graphql-tools/pull/4963)
  [`be24e9ef`](https://github.com/ardatan/graphql-tools/commit/be24e9efaaf0f159e32d8f6271275df202240ad5)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix signature of default http executor

## 0.0.9

### Patch Changes

- [#4941](https://github.com/ardatan/graphql-tools/pull/4941)
  [`0e5d250c`](https://github.com/ardatan/graphql-tools/commit/0e5d250cbac7ab003c45020b5ea464a8924eed01)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`@whatwg-node/fetch@0.6.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.1) (from
    `0.5.4`, in `dependencies`)

- [#4943](https://github.com/ardatan/graphql-tools/pull/4943)
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`value-or-promise@1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.11`, in `dependencies`)
- Updated dependencies
  [[`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/utils@9.1.4

## 0.0.8

### Patch Changes

- [#4934](https://github.com/ardatan/graphql-tools/pull/4934)
  [`d0383dd6`](https://github.com/ardatan/graphql-tools/commit/d0383dd664e74e653bd933b5e4aefd3ea77b5a52)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.5.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.4) (from
    `0.5.3`, in `dependencies`)

## 0.0.7

### Patch Changes

- [#4885](https://github.com/ardatan/graphql-tools/pull/4885)
  [`969e264d`](https://github.com/ardatan/graphql-tools/commit/969e264df43bab2a7d0d21c09cb3d73c938b0895)
  Thanks [@paales](https://github.com/paales)! - useGETForQueries was also activating GET for
  mutations

## 0.0.6

### Patch Changes

- [#4887](https://github.com/ardatan/graphql-tools/pull/4887)
  [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix leak on Node 14 and add cancellation to async
  iterables correctly

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2

## 0.0.4

### Patch Changes

- [#4839](https://github.com/ardatan/graphql-tools/pull/4839)
  [`92dd4714`](https://github.com/ardatan/graphql-tools/commit/92dd4714acc3881f0bccf5734339c4f34f9fe2d4)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.5.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.3) (from
    `0.5.1`, in `dependencies`)

## 0.0.3

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1

## 0.0.2

### Patch Changes

- [`e2fc041e`](https://github.com/ardatan/graphql-tools/commit/e2fc041e6f751c70efc20e8a02cbf88da0b905d2)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve typings

## 0.0.1

### Patch Changes

- [#4829](https://github.com/ardatan/graphql-tools/pull/4829)
  [`61812ccb`](https://github.com/ardatan/graphql-tools/commit/61812ccb97d6e179e74d72661dd0736f6ca0a7ff)
  Thanks [@ardatan](https://github.com/ardatan)! - Break down UrlLoader into different pieces
