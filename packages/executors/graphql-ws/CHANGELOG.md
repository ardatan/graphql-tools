# @graphql-tools/executor-graphql-ws

## 1.3.1

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5

## 1.3.0

### Minor Changes

- [#6540](https://github.com/ardatan/graphql-tools/pull/6540)
  [`1e085bd`](https://github.com/ardatan/graphql-tools/commit/1e085bd8516a692e91afe3f1b95b9f5740485693)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow to configure headers of the
  WebSocket sent with the upgrade request.

## 1.2.1

### Patch Changes

- [#6536](https://github.com/ardatan/graphql-tools/pull/6536)
  [`3facde0`](https://github.com/ardatan/graphql-tools/commit/3facde02724add648a00feafaaee6a76a443d25d)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - `webSocketImpl` and `lazy` options were
  ignored and overriden by default values. This is no longer the case and it's now possible to
  change the `WebSocket` implementation.

## 1.2.0

### Minor Changes

- [#6323](https://github.com/ardatan/graphql-tools/pull/6323)
  [`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement Symbol.dispose or Symbol.asyncDispose
  to make \`Executor\`s \`Disposable\`

### Patch Changes

- Updated dependencies
  [[`cacf20f`](https://github.com/ardatan/graphql-tools/commit/cacf20f8dbe4ec5dce0d5fd87e37cf69ef9b177e)]:
  - @graphql-tools/utils@10.3.0

## 1.1.2

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.2`, in `dependencies`)

## 1.1.1

### Patch Changes

- [#5666](https://github.com/ardatan/graphql-tools/pull/5666)
  [`6269314d`](https://github.com/ardatan/graphql-tools/commit/6269314dfe2ae7b9074096a2831e39c9ee17be0a)
  Thanks [@ThomasMoritz](https://github.com/ThomasMoritz)! - changed the order how the configuration
  is given into the graphql-wsclient and prevent the overwriting of the parameters

## 1.1.0

### Minor Changes

- [#4781](https://github.com/ardatan/graphql-tools/pull/4781)
  [`104921ff`](https://github.com/ardatan/graphql-tools/commit/104921ffc066bde737d4cb36a3bbd1b3b2ad4094)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Read and use `connectionParams` from
  operation extensions

## 1.0.2

### Patch Changes

- [#5396](https://github.com/ardatan/graphql-tools/pull/5396)
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)
  Thanks [@ardatan](https://github.com/ardatan)! - Simplify GraphQL WS executor

- Updated dependencies
  [[`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c),
  [`bb8f169e`](https://github.com/ardatan/graphql-tools/commit/bb8f169e21a8a7002b66d3bc6e4e4b40cc2a5f5c)]:
  - @graphql-tools/utils@10.0.2

## 1.0.1

### Patch Changes

- [#5374](https://github.com/ardatan/graphql-tools/pull/5374)
  [`88a7de96`](https://github.com/ardatan/graphql-tools/commit/88a7de96c7766d94f9ac0adbe54523e585f8566c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.14.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.14.0)
    (from `5.13.1`, in `dependencies`)

## 1.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- [#5272](https://github.com/ardatan/graphql-tools/pull/5272)
  [`3a870139`](https://github.com/ardatan/graphql-tools/commit/3a870139e13236f3ecc744666dd1c6fdb9f6be59)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`graphql-ws@5.13.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.13.0)
    (from `5.12.1`, in `dependencies`)

- [#5277](https://github.com/ardatan/graphql-tools/pull/5277)
  [`853db708`](https://github.com/ardatan/graphql-tools/commit/853db70824fc86350a61bae415b7965fa2c06355)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.13.1` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.13.1)
    (from `5.13.0`, in `dependencies`)
- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 0.0.14

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

## 0.0.13

### Patch Changes

- [#5112](https://github.com/ardatan/graphql-tools/pull/5112)
  [`828fbf93`](https://github.com/ardatan/graphql-tools/commit/828fbf93ff317d00577c9a94402736bac5f4be39)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ws@8.13.0` ↗︎](https://www.npmjs.com/package/ws/v/8.13.0) (from `8.12.1`,
    in `dependencies`)
  - Updated dependency [`graphql-ws@5.12.1` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.12.1)
    (from `5.12.0`, in `dependencies`)

## 0.0.12

### Patch Changes

- [#5096](https://github.com/ardatan/graphql-tools/pull/5096)
  [`a5073e85`](https://github.com/ardatan/graphql-tools/commit/a5073e85124fa90db9dda606ed70a4a560d95737)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.12.0` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.12.0)
    (from `5.11.3`, in `dependencies`)

## 0.0.11

### Patch Changes

- [#5058](https://github.com/ardatan/graphql-tools/pull/5058)
  [`1298727c`](https://github.com/ardatan/graphql-tools/commit/1298727c629b4d535b023dcf920639ae43571692)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ws@8.12.1` ↗︎](https://www.npmjs.com/package/ws/v/8.12.1) (from `8.12.0`,
    in `dependencies`)

## 0.0.10

### Patch Changes

- Updated dependencies
  [[`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/utils@9.2.1

## 0.0.9

### Patch Changes

- [#5020](https://github.com/ardatan/graphql-tools/pull/5020)
  [`d104ce50`](https://github.com/ardatan/graphql-tools/commit/d104ce50a9ee18e92ffc92c39ff87e1cffc2aa19)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`graphql-ws@5.11.3` ↗︎](https://www.npmjs.com/package/graphql-ws/v/5.11.3)
    (from `5.11.2`, in `dependencies`)

## 0.0.8

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0

## 0.0.7

### Patch Changes

- [`1c291f33`](https://github.com/ardatan/graphql-tools/commit/1c291f33ba5e42126b5335530c1ac4cd6b3eaf6a)
  Thanks [@ardatan](https://github.com/ardatan)! - Support regular queries and mutations in WS
  Executor

## 0.0.6

### Patch Changes

- [#4952](https://github.com/ardatan/graphql-tools/pull/4952)
  [`1c4853cb`](https://github.com/ardatan/graphql-tools/commit/1c4853cb8563d83c0d862d3c11257c48c7d1469c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`ws@8.12.0` ↗︎](https://www.npmjs.com/package/ws/v/8.12.0) (from `8.11.0`,
    in `dependencies`)
- Updated dependencies
  [[`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/utils@9.1.4

## 0.0.5

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3

## 0.0.4

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2

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
