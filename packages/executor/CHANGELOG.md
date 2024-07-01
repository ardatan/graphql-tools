# @graphql-tools/executor

## 1.2.8

### Patch Changes

- [#6306](https://github.com/ardatan/graphql-tools/pull/6306)
  [`74f995f`](https://github.com/ardatan/graphql-tools/commit/74f995f17dfea6385e08bcdd662e7ad6fcfb5dfa)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Properly propagate the original error in custom
  scalars.

  Errors thrown in the `parseValue` function for custom scalars were not propagated correctly using
  the `originalError` property of the `GraphQLError` on invalid input. As a result, error codes from
  the `extensions.code` were not propagated correctly.

- Updated dependencies
  [[`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c)]:
  - @graphql-tools/utils@10.2.3

## 1.2.7

### Patch Changes

- [#6280](https://github.com/ardatan/graphql-tools/pull/6280)
  [`7dcd0af`](https://github.com/ardatan/graphql-tools/commit/7dcd0affcae14d8798426f3e2556b91a19df5986)
  Thanks [@ardatan](https://github.com/ardatan)! - Since the executor is version agnostic, it should
  respect the schemas created with older versions.

  So if a type resolver returns a type instead of type name which is required since `graphql@16`,
  the executor should handle it correctly.

  See the following example:

  ```ts
  // Assume that the following code is executed with `graphql@15`
  import { execute } from '@graphql-tools/executor'

  const BarType = new GraphQLObjectType({
    name: 'Bar',
    fields: {
      bar: {
        type: GraphQLString,
        resolve: () => 'bar'
      }
    }
  })
  const BazType = new GraphQLObjectType({
    name: 'Baz',
    fields: {
      baz: {
        type: GraphQLString,
        resolve: () => 'baz'
      }
    }
  })
  const BarBazType = new GraphQLUnionType({
    name: 'BarBaz',
    types: [BarType, BazType],
    // This is the resolver that returns the type instead of type name
    resolveType(obj) {
      if ('bar' in obj) {
        return BarType
      }
      if ('baz' in obj) {
        return BazType
      }
    }
  })
  const QueryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      barBaz: {
        type: BarBazType,
        resolve: () => ({ bar: 'bar' })
      }
    }
  })
  const schema = new GraphQLSchema({
    query: QueryType
  })

  const result = await execute({
    schema,
    document: parse(/* GraphQL */ `
      query {
        barBaz {
          ... on Bar {
            bar
          }
          ... on Baz {
            baz
          }
        }
      }
    `)
  })

  expect(result).toEqual({
    data: {
      barBaz: {
        bar: 'bar'
      }
    }
  })
  ```

## 1.2.6

### Patch Changes

- [#6038](https://github.com/ardatan/graphql-tools/pull/6038)
  [`02dd9ac`](https://github.com/ardatan/graphql-tools/commit/02dd9ac2ee92f6e390098a91753c1bcf5ef71cbc)
  Thanks [@ardatan](https://github.com/ardatan)! - Some libraries like `undici` throw objects that
  are not `Error` instances when the response is tried to parse as JSON but failed. In that case,
  executor prints an error like below;

  ```
  NonErrorThrown: Unexpected error value: {...}
  at toError (/usr/src/app/node_modules/graphql/jsutils/toError.js:16:7)
  at locatedError (/usr/src/app/node_modules/graphql/error/locatedError.js:20:46)
  at /usr/src/app/node_modules/@graphql-tools/executor/cjs/execution/execute.js:330:58
  at processTicksAndRejections (node:internal/process/task_queues:95:5)
  at async /usr/src/app/node_modules/@graphql-tools/executor/cjs/execution/promiseForObject.js:18:35
  at async Promise.all (index 0)
  ```

  But actually the shape of the object matches the `Error` interface. In that case, the executor now
  coerces the object to an `Error` instance by taking `message`, `stack`, `name` and `cause`
  properties. So the user will get the error correctly.

## 1.2.5

### Patch Changes

- [#6020](https://github.com/ardatan/graphql-tools/pull/6020)
  [`b07be2b`](https://github.com/ardatan/graphql-tools/commit/b07be2b2f588345f85167776e8d31e976b110e1f)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Correctly raise `AbortError` for defer payloads

## 1.2.4

### Patch Changes

- [#6009](https://github.com/ardatan/graphql-tools/pull/6009)
  [`14a001e`](https://github.com/ardatan/graphql-tools/commit/14a001e7b82aa30371bb97c33cf0b5c145270ddf)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - correctly raise abort exception for Promise and
  sync execution

## 1.2.3

### Patch Changes

- [#6006](https://github.com/ardatan/graphql-tools/pull/6006)
  [`a5364eb`](https://github.com/ardatan/graphql-tools/commit/a5364eb0723376ad67492369415e17c7d4568d77)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - fix rejecting when canceling async iterable
  returned from normalized executor

## 1.2.2

### Patch Changes

- [#5965](https://github.com/ardatan/graphql-tools/pull/5965)
  [`3e10da6`](https://github.com/ardatan/graphql-tools/commit/3e10da6b2bf97bdf40317a6d88a0cc6412fd0974)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - revert subscription event source error handling to
  graphql-js behaviour

- Updated dependencies
  [[`baf3c28`](https://github.com/ardatan/graphql-tools/commit/baf3c28f43dcfafffd15386daeb153bc2895c1b3)]:
  - @graphql-tools/utils@10.1.1

## 1.2.1

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.8`, in `dependencies`)

## 1.2.0

### Minor Changes

- [#5291](https://github.com/ardatan/graphql-tools/pull/5291)
  [`ae20c707`](https://github.com/ardatan/graphql-tools/commit/ae20c707b2edcfc0ee6112236bbd22de5fbd0c78)
  Thanks [@ardatan](https://github.com/ardatan)! - Accept `AbortSignal` in ExecutionArgs

## 1.1.0

### Minor Changes

- [#5295](https://github.com/ardatan/graphql-tools/pull/5295)
  [`b255b62c`](https://github.com/ardatan/graphql-tools/commit/b255b62c9e79076648b4d3a710584a237dead529)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Ensure errors thrown within scalars serialize
  function are mapped to `Error`.

## 1.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 0.0.20

### Patch Changes

- [#5215](https://github.com/ardatan/graphql-tools/pull/5215)
  [`88244048`](https://github.com/ardatan/graphql-tools/commit/882440487551abcb5bdd4f626f3b56ac2e886f11)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve `promiseForObject`

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

## 0.0.19

### Patch Changes

- [#5202](https://github.com/ardatan/graphql-tools/pull/5202)
  [`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@repeaterjs/repeater@^3.0.4` ↗︎](https://www.npmjs.com/package/@repeaterjs/repeater/v/3.0.4)
    (from `3.0.4`, in `dependencies`)
  - Updated dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.12`, in `dependencies`)

## 0.0.18

### Patch Changes

- [#5187](https://github.com/ardatan/graphql-tools/pull/5187)
  [`91a895be`](https://github.com/ardatan/graphql-tools/commit/91a895bea32dc4226da08e8981ded3f55f4c53f3)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle errors thrown from the field subscriber

## 0.0.17

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

## 0.0.16

### Patch Changes

- [#5112](https://github.com/ardatan/graphql-tools/pull/5112)
  [`828fbf93`](https://github.com/ardatan/graphql-tools/commit/828fbf93ff317d00577c9a94402736bac5f4be39)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-typed-document-node/core@3.2.0` ↗︎](https://www.npmjs.com/package/@graphql-typed-document-node/core/v/3.2.0)
    (from `3.1.2`, in `dependencies`)

## 0.0.15

### Patch Changes

- [#5065](https://github.com/ardatan/graphql-tools/pull/5065)
  [`77c1002e`](https://github.com/ardatan/graphql-tools/commit/77c1002e2165a913508fb505513f9289db4f8cd3)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-typed-document-node/core@3.1.2` ↗︎](https://www.npmjs.com/package/@graphql-typed-document-node/core/v/3.1.2)
    (from `3.1.1`, in `dependencies`)

## 0.0.14

### Patch Changes

- Updated dependencies
  [[`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/utils@9.2.1

## 0.0.13

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0

## 0.0.12

### Patch Changes

- [#4943](https://github.com/ardatan/graphql-tools/pull/4943)
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`value-or-promise@1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.11`, in `dependencies`)
- Updated dependencies
  [[`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/utils@9.1.4

## 0.0.11

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3

## 0.0.10

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2

## 0.0.9

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1

## 0.0.8

### Patch Changes

- [#4837](https://github.com/ardatan/graphql-tools/pull/4837)
  [`1d3856dc`](https://github.com/ardatan/graphql-tools/commit/1d3856dccaaafe2da96c91dd38dcce356bc734a3)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix backpressure logic in normalizedExecutor

## 0.0.7

### Patch Changes

- Updated dependencies
  [[`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/utils@9.1.0

## 0.0.6

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1

## 0.0.5

### Patch Changes

- [#4814](https://github.com/ardatan/graphql-tools/pull/4814)
  [`79e5554b`](https://github.com/ardatan/graphql-tools/commit/79e5554b524d1404f70c932cb43bdd55869ddfff)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`value-or-promise@1.0.11` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.11) (from
    `1.0.1`, in `dependencies`)

- [#4811](https://github.com/ardatan/graphql-tools/pull/4811)
  [`185f1e97`](https://github.com/ardatan/graphql-tools/commit/185f1e9738fbd53a894948d769e827a6e9e0ff60)
  Thanks [@owenallenaz](https://github.com/owenallenaz)! - add `tslib` as a dependency

## 0.0.4

### Patch Changes

- [`f47f3559`](https://github.com/ardatan/graphql-tools/commit/f47f35593d4e5b785359f4d5dbdb2981156fecba)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not push the following result until the latest
  one consumed

## 0.0.3

### Patch Changes

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796)
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Added dependency
    [`@repeaterjs/repeater@3.0.4` ↗︎](https://www.npmjs.com/package/@repeaterjs/repeater/v/3.0.4)
    (to `dependencies`)
  - Added dependency
    [`value-or-promise@1.0.1` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.1) (to
    `dependencies`)

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796)
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)
  Thanks [@saihaj](https://github.com/saihaj)! - get defer stream from graphql-js

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/utils@9.0.0

## 0.0.2

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175)]:
  - @graphql-tools/utils@8.13.1

## 0.0.1

### Patch Changes

- [#4778](https://github.com/ardatan/graphql-tools/pull/4778)
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)
  Thanks [@saihaj](https://github.com/saihaj)! - initial release

- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/utils@8.13.0
