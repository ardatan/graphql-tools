# @graphql-tools/federation

## 1.1.16

### Patch Changes

- [`7583729`](https://github.com/ardatan/graphql-tools/commit/7583729718ffd528bba5d1c5c4ea087975102c1f) Thanks [@ardatan](https://github.com/ardatan)! - Fix `getSubschemaForFederationWithTypeDefs` for non-supergraph merging of subgraphs

## 1.1.15

### Patch Changes

- [#5885](https://github.com/ardatan/graphql-tools/pull/5885) [`2d76909`](https://github.com/ardatan/graphql-tools/commit/2d76909908a918562a9f7599825b70ae60f91127) Thanks [@ardatan](https://github.com/ardatan)! - Avoid creating invalid schema when there is no entity

## 1.1.14

### Patch Changes

- [#5878](https://github.com/ardatan/graphql-tools/pull/5878) [`ba062ff`](https://github.com/ardatan/graphql-tools/commit/ba062ff4880f6922eaddfcbd746782275a8f689e) Thanks [@darren-west](https://github.com/darren-west)! - fix: buildSubgraphSchema with no entity keys

## 1.1.13

### Patch Changes

- [`974df8a`](https://github.com/ardatan/graphql-tools/commit/974df8a1a1bca422bac5d971a3f8029cd9728efd) Thanks [@ardatan](https://github.com/ardatan)! - Debug logging & expose the subgraph schema

- Updated dependencies [[`b798b3b`](https://github.com/ardatan/graphql-tools/commit/b798b3b0a54f634bf2dd2275ef47f5263a5ce238)]:
  - @graphql-tools/executor-http@1.0.6

## 1.1.12

### Patch Changes

- [`efedc590`](https://github.com/ardatan/graphql-tools/commit/efedc59018ea1d63f86973d0c6608b3c7ddc2e71)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle unions correctly

## 1.1.11

### Patch Changes

- [`250715a1`](https://github.com/ardatan/graphql-tools/commit/250715a1e18f0c645240ea78bb80f7557ac81340)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `extend type` in subgraph SDL

- [`250715a1`](https://github.com/ardatan/graphql-tools/commit/250715a1e18f0c645240ea78bb80f7557ac81340)
  Thanks [@ardatan](https://github.com/ardatan)! - Support supergraph with no join\_\_type
  directives on Query type

## 1.1.10

### Patch Changes

- [`cda328c3`](https://github.com/ardatan/graphql-tools/commit/cda328c3e487ea51e13a3b18f0e2e494fd3275ca)
  Thanks [@ardatan](https://github.com/ardatan)! - Support for multiple key entrypoints for an
  object, and avoid sending whole object if possible

- Updated dependencies
  [[`cda328c3`](https://github.com/ardatan/graphql-tools/commit/cda328c3e487ea51e13a3b18f0e2e494fd3275ca)]:
  - @graphql-tools/stitch@9.0.2

## 1.1.9

### Patch Changes

- [`3ed8cbd6`](https://github.com/ardatan/graphql-tools/commit/3ed8cbd68988492e8b220a82b3590bad2a1c672b)
  Thanks [@ardatan](https://github.com/ardatan)! - Support @join\_\_implements in Federation

## 1.1.8

### Patch Changes

- [`7fe63895`](https://github.com/ardatan/graphql-tools/commit/7fe63895c1b989de3ab433e90945cb318718ddac)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix Fed v2 support

## 1.1.7

### Patch Changes

- [#5579](https://github.com/ardatan/graphql-tools/pull/5579)
  [`d30e8735`](https://github.com/ardatan/graphql-tools/commit/d30e8735682c3a7209cded3fc16dd889ddfa5ddf)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations and refactor

## 1.1.6

### Patch Changes

- [`9b404e83`](https://github.com/ardatan/graphql-tools/commit/9b404e8346af2831e3ed56326cd9e1e9f8582b42)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle type ownerships correctly

## 1.1.5

### Patch Changes

- [#5567](https://github.com/ardatan/graphql-tools/pull/5567)
  [`61393975`](https://github.com/ardatan/graphql-tools/commit/61393975c535e45c108500feea1ceec461586c6e)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect input types

## 1.1.4

### Patch Changes

- [#5559](https://github.com/ardatan/graphql-tools/pull/5559)
  [`ada5c56a`](https://github.com/ardatan/graphql-tools/commit/ada5c56af472e06d595e53a035c105e745490bfc)
  Thanks [@ardatan](https://github.com/ardatan)! - Support unowned types such as interfaces, unions
  and scalars

## 1.1.3

### Patch Changes

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency [`lodash.pick@^4.4.0` ↗︎](https://www.npmjs.com/package/lodash.pick/v/4.4.0)
    (from `dependencies`)

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations for federation

- Updated dependencies
  [[`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)]:
  - @graphql-tools/delegate@10.0.1
  - @graphql-tools/stitch@9.0.1

## 1.1.2

### Patch Changes

- [#5468](https://github.com/ardatan/graphql-tools/pull/5468)
  [`de9e8a67`](https://github.com/ardatan/graphql-tools/commit/de9e8a678a0ab38e5fc1cbf6c1bf27c265cc0c01)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`lodash.pick@^4.4.0` ↗︎](https://www.npmjs.com/package/lodash.pick/v/4.4.0)
    (to `dependencies`)

- [#5468](https://github.com/ardatan/graphql-tools/pull/5468)
  [`de9e8a67`](https://github.com/ardatan/graphql-tools/commit/de9e8a678a0ab38e5fc1cbf6c1bf27c265cc0c01)
  Thanks [@ardatan](https://github.com/ardatan)! - Reduce the number of upstream requests

## 1.1.1

### Patch Changes

- [`d593dfce`](https://github.com/ardatan/graphql-tools/commit/d593dfce52a895993c754903687043a9d5429803)
  Thanks [@ardatan](https://github.com/ardatan)! - Adding `batch` option to allow batching

## 1.1.0

### Minor Changes

- [#5455](https://github.com/ardatan/graphql-tools/pull/5455)
  [`d4de4a8e`](https://github.com/ardatan/graphql-tools/commit/d4de4a8e84f7dabbaab058b264a350a3592dd752)
  Thanks [@ardatan](https://github.com/ardatan)! - Supergraph SDL support

## 1.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`8fba6cc1`](https://github.com/ardatan/graphql-tools/commit/8fba6cc1876e914d587f5b253332aaedbcaa65e6),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/executor-http@1.0.0
  - @graphql-tools/delegate@10.0.0
  - @graphql-tools/schema@10.0.0
  - @graphql-tools/stitch@9.0.0
  - @graphql-tools/merge@9.0.0
  - @graphql-tools/utils@10.0.0
  - @graphql-tools/wrap@10.0.0

## 0.0.3

### Patch Changes

- [#5223](https://github.com/ardatan/graphql-tools/pull/5223)
  [`24c13616`](https://github.com/ardatan/graphql-tools/commit/24c136160fe675c08c1c1fe06bfb8883cdf0b466)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor-http@^0.1.9` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/0.1.9)
    (from `^0.0.7`, in `dependencies`)

## 0.0.2

### Patch Changes

- [#5212](https://github.com/ardatan/graphql-tools/pull/5212)
  [`0cd9e8c4`](https://github.com/ardatan/graphql-tools/commit/0cd9e8c4469d07e53ad8e7944ba144f58c4db34f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/delegate@^9.0.19` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.19)
    (from `9.0.19`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^8.3.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/8.3.16)
    (from `8.3.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^9.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/9.0.14)
    (from `9.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^9.2.20` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.2.20)
    (from `9.2.20`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^9.1.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.1.3)
    (from `9.1.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor-http@^0.0.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/0.0.7)
    (from `0.0.7`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^8.7.34` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/8.7.34)
    (from `8.7.34`, in `dependencies`)
  - Added dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (to
    `dependencies`)

- [#5215](https://github.com/ardatan/graphql-tools/pull/5215)
  [`88244048`](https://github.com/ardatan/graphql-tools/commit/882440487551abcb5bdd4f626f3b56ac2e886f11)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid object spread

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

- Updated dependencies
  [[`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)]:
  - @graphql-tools/delegate@9.0.35
  - @graphql-tools/stitch@8.7.49

## 0.0.1

### Patch Changes

- [#4974](https://github.com/ardatan/graphql-tools/pull/4974)
  [`1c0e80a6`](https://github.com/ardatan/graphql-tools/commit/1c0e80a60827169eb3eb99fe5710b1e891b89740)
  Thanks [@ardatan](https://github.com/ardatan)! - New Federation package
