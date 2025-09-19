# @graphql-tools/import

## 7.1.2

### Patch Changes

- [#7492](https://github.com/ardatan/graphql-tools/pull/7492)
  [`62a6da3`](https://github.com/ardatan/graphql-tools/commit/62a6da31fff40c5e5addb5de54991b87e08e7dae)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.20.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.20.0)
    (from `^0.19.0`, in `dependencies`)

## 7.1.1

### Patch Changes

- [#7433](https://github.com/ardatan/graphql-tools/pull/7433)
  [`07124d5`](https://github.com/ardatan/graphql-tools/commit/07124d5c146affa8c379bd9c888e2faf31a0c245)
  Thanks [@HunterLarco](https://github.com/HunterLarco)! - Fix support for absolute path aliases in
  GraphQL imports

  Path aliases configured with absolute paths (e.g., `/*` → `src/*`) now work correctly alongside
  relative aliases (e.g., `@/*` → `src/*`). This allows more flexible aliasing configurations when
  using [tsconfig.json#paths](https://www.typescriptlang.org/tsconfig/#paths) syntax for GraphQL
  imports.

- [#7437](https://github.com/ardatan/graphql-tools/pull/7437)
  [`211ef44`](https://github.com/ardatan/graphql-tools/commit/211ef440ec9615f82deaf74c0b5d760fc9e716e0)
  Thanks [@HunterLarco](https://github.com/HunterLarco)! - enhance GraphQL schema import error
  debugging with source locations

## 7.1.0

### Minor Changes

- [#7310](https://github.com/ardatan/graphql-tools/pull/7310)
  [`692cfeb`](https://github.com/ardatan/graphql-tools/commit/692cfeb444a9e4c8e17f1bbb7cf87914e2230a30)
  Thanks [@HunterLarco](https://github.com/HunterLarco)! - GraphQL schemas in large projects,
  especially monorepos, suffer from fragile and verbose relative import paths that become difficult
  to maintain as projects grow. This change brings TypeScript's popular
  [`tsconfig.json#paths`](https://www.typescriptlang.org/tsconfig/#paths) aliasing syntax to GraphQL
  imports, enabling clean, maintainable import statements across your GraphQL schema files.

  **Before** - Brittle relative imports:

  ```graphql
  #import "../../../shared/models/User.graphql"
  #import "../../../../common/types/Product.graphql"
  ```

  **After** - Clean, semantic aliases:

  ```graphql
  #import "@models/User.graphql"
  #import "@types/Product.graphql"
  ```

  **Configuration Example**

  ```ts
  {
    mappings: {
      '@models/*': path.join(__dirname, './models/*'),
      '@types/*': path.join(__dirname, './shared/types/*'),
    }
  }
  ```

  This change is introduced in a backwards compatible way to ensure no existing use cases are broken
  while using familiar patterns to typescript developers for structuring import aliases.

## 7.0.21

### Patch Changes

- Updated dependencies
  [[`32d0457`](https://github.com/ardatan/graphql-tools/commit/32d0457f3fae53b408bd8de459bf4541fcc14a23)]:
  - @graphql-tools/utils@10.9.1

## 7.0.20

### Patch Changes

- [#7229](https://github.com/ardatan/graphql-tools/pull/7229)
  [`a824120`](https://github.com/ardatan/graphql-tools/commit/a8241205862ebcf294a835da6eb782f777e9fdfb)
  Thanks [@jdolle](https://github.com/jdolle)! - dependencies updates:
  - Added dependency
    [`@theguild/federation-composition@^0.18.3` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.18.3)
    (to `dependencies`)

- [#7260](https://github.com/ardatan/graphql-tools/pull/7260)
  [`d15c850`](https://github.com/ardatan/graphql-tools/commit/d15c850d69c3b7d034828f397c8fa59ca30e9b98)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@theguild/federation-composition@^0.19.0` ↗︎](https://www.npmjs.com/package/@theguild/federation-composition/v/0.19.0)
    (from `^0.18.3`, in `dependencies`)

- [#7229](https://github.com/ardatan/graphql-tools/pull/7229)
  [`a824120`](https://github.com/ardatan/graphql-tools/commit/a8241205862ebcf294a835da6eb782f777e9fdfb)
  Thanks [@jdolle](https://github.com/jdolle)! - Adjust dependency and definition logic to include
  federated links

- Updated dependencies
  [[`22af985`](https://github.com/ardatan/graphql-tools/commit/22af98581e983079ec7e53677b905d3d03117524),
  [`53db005`](https://github.com/ardatan/graphql-tools/commit/53db00540c2549748afdeeb65bb45a6c45ce57d3)]:
  - @graphql-tools/utils@10.9.0

## 7.0.19

### Patch Changes

- [#7225](https://github.com/ardatan/graphql-tools/pull/7225)
  [`99e6faf`](https://github.com/ardatan/graphql-tools/commit/99e6faf036f370db13f52b8f414b4c90f417de7a)
  Thanks [@jdolle](https://github.com/jdolle)! - Support 'extend schema' syntax and add 'link' to
  the list of builtins so that it doesnt need a directive definition for federated schemas

## 7.0.18

### Patch Changes

- Updated dependencies
  [[`d123e26`](https://github.com/ardatan/graphql-tools/commit/d123e26b30b4febbbe1780bd32773b60e614dbf0)]:
  - @graphql-tools/utils@10.8.6

## 7.0.17

### Patch Changes

- Updated dependencies
  [[`90a717e`](https://github.com/ardatan/graphql-tools/commit/90a717e35a7e4e51da4fe747cb73544f24698fb7),
  [`26518de`](https://github.com/ardatan/graphql-tools/commit/26518debfcb668e8feb5fb146271a13da92b778a)]:
  - @graphql-tools/utils@10.8.5

## 7.0.16

### Patch Changes

- Updated dependencies
  [[`155944b`](https://github.com/ardatan/graphql-tools/commit/155944b11e7ff1d8816ba3e9a4e4aa035c81f645)]:
  - @graphql-tools/utils@10.8.4

## 7.0.15

### Patch Changes

- Updated dependencies
  [[`4a2eb14`](https://github.com/ardatan/graphql-tools/commit/4a2eb14d0e3394d3dfbb3d83856500c5fb548285)]:
  - @graphql-tools/utils@10.8.3

## 7.0.14

### Patch Changes

- Updated dependencies
  [[`3547bba`](https://github.com/ardatan/graphql-tools/commit/3547bbadd3ad4fa01a950fd685345f7c9c934e2f)]:
  - @graphql-tools/utils@10.8.2

## 7.0.13

### Patch Changes

- Updated dependencies
  [[`651a5dc`](https://github.com/ardatan/graphql-tools/commit/651a5dccb466b04f7fd16561cd264acd306e0711)]:
  - @graphql-tools/utils@10.8.1

## 7.0.12

### Patch Changes

- Updated dependencies
  [[`0a3e193`](https://github.com/ardatan/graphql-tools/commit/0a3e193e1ed70bd744375bfb4a10e515ecf59019),
  [`357b2ee`](https://github.com/ardatan/graphql-tools/commit/357b2ee6eef5e1f3b2b067728e9b167b1c2f82e5)]:
  - @graphql-tools/utils@10.8.0

## 7.0.11

### Patch Changes

- Updated dependencies
  [[`53bb601`](https://github.com/ardatan/graphql-tools/commit/53bb60104782738f51a2c2de42d6da7aba191537),
  [`53bb601`](https://github.com/ardatan/graphql-tools/commit/53bb60104782738f51a2c2de42d6da7aba191537)]:
  - @graphql-tools/utils@10.7.2

## 7.0.10

### Patch Changes

- Updated dependencies
  [[`4912f19`](https://github.com/ardatan/graphql-tools/commit/4912f19b290a06c603b00e268d49abebddc3fd6d)]:
  - @graphql-tools/utils@10.7.1

## 7.0.9

### Patch Changes

- [#6796](https://github.com/ardatan/graphql-tools/pull/6796)
  [`ddfef2c`](https://github.com/ardatan/graphql-tools/commit/ddfef2c322ba66a8dd06f28a5c8006348f1dc0a9)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid importing `process` and use it from
  `globalThis`. In some cases, `cwd` is not exported with this name in the environment in ESM scope.
- Updated dependencies
  [[`2c70d27`](https://github.com/ardatan/graphql-tools/commit/2c70d276c510be18f7ce9e966c4653ff3c9b2641)]:
  - @graphql-tools/utils@10.7.0

## 7.0.8

### Patch Changes

- Updated dependencies
  [[`6a8123b`](https://github.com/ardatan/graphql-tools/commit/6a8123be34d3270e4e6a628c7b4ef35fa66f52a1)]:
  - @graphql-tools/utils@10.6.4

## 7.0.7

### Patch Changes

- Updated dependencies
  [[`020b9e4`](https://github.com/ardatan/graphql-tools/commit/020b9e47b51f9847bf915de5faefe09dc04d9612)]:
  - @graphql-tools/utils@10.6.3

## 7.0.6

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

## 7.0.5

### Patch Changes

- Updated dependencies
  [[`1e02935`](https://github.com/ardatan/graphql-tools/commit/1e0293562961fb12b267235e5aa6d0e83d0e7d0f)]:
  - @graphql-tools/utils@10.6.1

## 7.0.4

### Patch Changes

- Updated dependencies
  [[`414e404`](https://github.com/ardatan/graphql-tools/commit/414e404a06478ea8ddd1065bd765de14af0f6c43)]:
  - @graphql-tools/utils@10.6.0

## 7.0.3

### Patch Changes

- Updated dependencies
  [[`dc5043b`](https://github.com/ardatan/graphql-tools/commit/dc5043bb7c9afaca907c242eb6bf65e8019d79c4)]:
  - @graphql-tools/utils@10.5.6

## 7.0.2

### Patch Changes

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5

## 7.0.1

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.0`, in `dependencies`)

## 7.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/utils@10.0.0

## 6.7.18

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

## 6.7.17

### Patch Changes

- Updated dependencies
  [[`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/utils@9.2.1

## 6.7.16

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0

## 6.7.15

### Patch Changes

- Updated dependencies
  [[`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/utils@9.1.4

## 6.7.14

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3

## 6.7.13

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2

## 6.7.12

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1

## 6.7.11

### Patch Changes

- Updated dependencies
  [[`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/utils@9.1.0

## 6.7.10

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1

## 6.7.9

### Patch Changes

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/utils@9.0.0

## 6.7.8

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175)]:
  - @graphql-tools/utils@8.13.1

## 6.7.7

### Patch Changes

- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/utils@8.13.0

## 6.7.6

### Patch Changes

- Updated dependencies
  [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0

## 6.7.5

### Patch Changes

- Updated dependencies
  [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f),
  [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0

## 6.7.4

### Patch Changes

- Updated dependencies
  [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97)]:
  - @graphql-tools/utils@8.10.1

## 6.7.3

### Patch Changes

- Updated dependencies
  [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0

## 6.7.2

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/utils@8.9.1

## 6.7.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0

## 6.7.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0

## 6.6.18

### Patch Changes

- Updated dependencies [4914970b]
  - @graphql-tools/utils@8.7.0

## 6.6.17

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/utils@8.6.13

## 6.6.16

### Patch Changes

- a5386350: fix(import): import dependent interfaces correctly
- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12

## 6.6.15

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11

## 6.6.14

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10

## 6.6.13

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9

## 6.6.12

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8

## 6.6.11

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7

## 6.6.10

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6

## 6.6.9

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5

## 6.6.8

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4

## 6.6.7

### Patch Changes

- Updated dependencies [3da3d66c]
  - @graphql-tools/utils@8.6.3

## 6.6.6

### Patch Changes

- Updated dependencies [18341363]
  - @graphql-tools/utils@8.6.2

## 6.6.5

### Patch Changes

- Updated dependencies [43a60f93]
- Updated dependencies [20e1058b]
  - @graphql-tools/utils@8.6.1

## 6.6.4

### Patch Changes

- 7c6b28e6: Changes to the documentation regarding processImport
- Updated dependencies [69b316c2]
  - @graphql-tools/utils@8.6.0

## 6.6.3

### Patch Changes

- Updated dependencies [7b5d72c5]
  - @graphql-tools/utils@8.5.5

## 6.6.2

### Patch Changes

- Updated dependencies [51315610]
  - @graphql-tools/utils@8.5.4

## 6.6.1

### Patch Changes

- Updated dependencies [960e178a]
- Updated dependencies [947a3fe0]
  - @graphql-tools/utils@8.5.3

## 6.6.0

### Minor Changes

- 61e00a6d: fix(import): allow import nested fragments

## 6.5.8

### Patch Changes

- Updated dependencies [233e0379]
  - @graphql-tools/utils@8.5.2

## 6.5.7

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/utils@8.5.1

## 6.5.6

### Patch Changes

- Updated dependencies [ad04dc79]
  - @graphql-tools/utils@8.5.0

## 6.5.5

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/utils@8.4.0

## 6.5.4

### Patch Changes

- Updated dependencies [58262be7]
  - @graphql-tools/utils@8.3.0

## 6.5.3

### Patch Changes

- 8ffbb600: Remove code causing Maximum call stack size exceeded in @graphql-tools/import package.

## 6.5.2

### Patch Changes

- Updated dependencies [1043219f]
  - @graphql-tools/utils@8.2.5

## 6.5.1

### Patch Changes

- be9fad09: fix(import): add missing dependency

## 6.5.0

### Minor Changes

- 1e90f094: Refactor processImport and export helper functions for parsing GraphQL imports

## 6.4.2

### Patch Changes

- a78fd76c: Schemata containing only imports will now resolve imported type's transitive
  dependencies.

## 6.4.1

### Patch Changes

- 652c21d7: #3327 - Transitive schema definition dependencies are now included in building out the
  full dependency structure.

## 6.4.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

## 6.3.1

### Patch Changes

- 77902864: fix(import): handle nested imports correctly

## 6.3.0

### Minor Changes

- 87709f42: processImport() now lets you know all the visited files by passing a map as a fourth
  argument.

## 6.2.6

### Patch Changes

- 5ec2e354: enhance(import): handle duplicate definitions

## 6.2.5

### Patch Changes

- eacf0dc3: Replace fs-extra with native methods

## 6.2.4

### Patch Changes

- 32c3c4f8: feat(import): support specifiedBy builtin directive
- 533d6d53: Bump all packages to allow adjustments
