# @graphql-tools/delegate

## 10.0.18

### Patch Changes

- [#6420](https://github.com/ardatan/graphql-tools/pull/6420)
  [`a867bbc`](https://github.com/ardatan/graphql-tools/commit/a867bbc9b5b91e89a09447797b4c02e22e47ddb4)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@repeaterjs/repeater@^3.0.6` ↗︎](https://www.npmjs.com/package/@repeaterjs/repeater/v/3.0.6)
    (to `dependencies`)

- [#6420](https://github.com/ardatan/graphql-tools/pull/6420)
  [`a867bbc`](https://github.com/ardatan/graphql-tools/commit/a867bbc9b5b91e89a09447797b4c02e22e47ddb4)
  Thanks [@ardatan](https://github.com/ardatan)! - Pass operation directives correctly to the
  subschema;

  ```graphql
  query {
    hello @someDir
  }
  ```

- [#6418](https://github.com/ardatan/graphql-tools/pull/6418)
  [`da93c08`](https://github.com/ardatan/graphql-tools/commit/da93c08b4bc22b5c9be81ed57beba8577f33118a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix extra inline fragments for all abstract types
  in the upstream schema call

  If there are two subschemas like below, the final `Node` interface is implemented by both `Oven`
  and `Toaster` while they are not implemented in both schemas. In this case the query
  `{ products { id ... on Node { id } } }` will need to be transformed to
  `{ products { id ... on Oven { id } ... on Node { id } } }` for the first subschema. But
  previously the query planner was automatically creating inline fragments for all possible types
  which was not optimal. Now it adds inline fragments only if this case is seen.

  ```graphql
  type Query {
    products: [Product]
  }

  union Product = Oven | Toaster

  interface Node {
    id: ID!
  }

  type Oven {
    id: ID!
  }

  type Toaster implements Node {
    id: ID!
    warranty: Int
  }
  ```

  And another one like below;

  ```graphql
  interface Node {
    id: ID!
  }

  type Oven implements Node {
    id: ID!
    warranty: Int
  }
  ```

- Updated dependencies
  [[`a867bbc`](https://github.com/ardatan/graphql-tools/commit/a867bbc9b5b91e89a09447797b4c02e22e47ddb4)]:
  - @graphql-tools/executor@1.3.1
  - @graphql-tools/utils@10.3.4

## 10.0.17

### Patch Changes

- [#6403](https://github.com/ardatan/graphql-tools/pull/6403)
  [`3803897`](https://github.com/ardatan/graphql-tools/commit/3803897cef27b15bad1718819c5d75030afbe781)
  Thanks [@ardatan](https://github.com/ardatan)! - Cleanup extra fields, empty inline fragments and
  duplicate \_\_typename fields

## 10.0.16

### Patch Changes

- [`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)
  Thanks [@ardatan](https://github.com/ardatan)! - Fail on query planning phase if the query plan is
  not successful before the actual execution

- Updated dependencies
  [[`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)]:
  - @graphql-tools/executor@1.3.0

## 10.0.15

### Patch Changes

- [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)
  Thanks [@ardatan](https://github.com/ardatan)! - If an abstract type on the gateway resolves to a
  type that does not exist on the gateway, return null instead of showing an error to the user

- [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)
  Thanks [@ardatan](https://github.com/ardatan)! - If an enum value coming from the subschema is not
  available on gateway, do not show an error to the user but return null instead

## 10.0.14

### Patch Changes

- [#6356](https://github.com/ardatan/graphql-tools/pull/6356)
  [`8094c37`](https://github.com/ardatan/graphql-tools/commit/8094c3733c745b2ccb7adcca38024c82c42319a0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - AggregateError errors are GraphQL located
  errors

  Instead of transforming the AggregateError itself to a GraphQL located error.

  This is because of two reasons:

  - AggregateError wont lose the instanceof its class
  - Expanding the AggregateError errors will each contain the proper locations

## 10.0.13

### Patch Changes

- [#6312](https://github.com/ardatan/graphql-tools/pull/6312)
  [`7b6f77a`](https://github.com/ardatan/graphql-tools/commit/7b6f77a46177def2488ab70ce938b94d0dcf3018)
  Thanks [@ardatan](https://github.com/ardatan)! - Use native `Promise.withResolvers` when possible

## 10.0.12

### Patch Changes

- [#6278](https://github.com/ardatan/graphql-tools/pull/6278)
  [`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle `@defer`

- Updated dependencies
  [[`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c),
  [`74f995f`](https://github.com/ardatan/graphql-tools/commit/74f995f17dfea6385e08bcdd662e7ad6fcfb5dfa)]:
  - @graphql-tools/utils@10.2.3
  - @graphql-tools/executor@1.2.8

## 10.0.11

### Patch Changes

- [#6194](https://github.com/ardatan/graphql-tools/pull/6194)
  [`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface objects in a different way

- [#6188](https://github.com/ardatan/graphql-tools/pull/6188)
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `subtractSelectionSets` to get the diff of
  two selection sets

- [#6187](https://github.com/ardatan/graphql-tools/pull/6187)
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not merge errors and regular resolved objects

  If a subschema returns an error for specific field that is already resolved by another subschema,
  the error should not be merged with the resolved object.

- [#6189](https://github.com/ardatan/graphql-tools/pull/6189)
  [`0134f7f`](https://github.com/ardatan/graphql-tools/commit/0134f7ffe5383603961d69337bfa5bceefb3ed74)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface types with non-shared
  implementations;

  For example, you have the following services, where `Node` is implemented in both services, but
  `Foo` and `Bar` are only implemented in one service. And when the gateway receives the following
  query, it should be converted to this because `Node` is not implemented as `Bar` in Service 1
  while implemented in Service 2.

  Query conversion;

  ```graphql
  # Gateway request
  query {
    fooBar(id: "1") {
      ... on Node {
        id
      }
    }
  }
  ```

  ```graphql
  # Service 1 Request
  query {
    fooBar(id: "1") {
      ... on Foo {
        id
      }
      ... on Bar {
        id
      }
    }
  }
  ```

  Services;

  ```graphql
  # Service 1

  union FooBar = Foo | Bar

  interface Node {
    id: ID!
  }

  type Foo implements Node {
    id: ID!
  }

  type Bar {
    id: ID!
  }

  type Query {
    fooBar(id: ID!): FooBar
  }
  ```

  ```graphql
  # Service 2
  interface Node {
    id: ID!
  }

  type Foo implements Node {
    id: ID!
  }

  type Bar implements Node {
    id: ID!
  }
  ```

- Updated dependencies
  [[`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)]:
  - @graphql-tools/schema@10.0.4
  - @graphql-tools/utils@10.2.1

## 10.0.10

### Patch Changes

- [#6134](https://github.com/ardatan/graphql-tools/pull/6134)
  [`a83da08`](https://github.com/ardatan/graphql-tools/commit/a83da087e24929ed0734a2cff63c97bd45cc9eb4)
  Thanks [@User](https://github.com/User)! - Ignore unmerged fields

  Let's say you have a gateway schema like in the bottom, and `id` is added to the query, only if
  the `age` is requested;

  ```graphql
  # This will be sent as-is
  {
    user {
      name
    }
  }
  ```

  But the following will be transformed;

  ```graphql
  {
    user {
      name
      age
    }
  }
  ```

  Into

  ````graphql
  {
    user {
      id
      name
      age
    }
  }


  ```graphql
  type Query {

  }

  type User {
    id: ID! # is the key for all services
    name: String!
    age: Int! # This comes from another service
  }
  ````

- [#6150](https://github.com/ardatan/graphql-tools/pull/6150)
  [`fc9c71f`](https://github.com/ardatan/graphql-tools/commit/fc9c71fbc9057a8e32e0d8813b23819c631afa65)
  Thanks [@ardatan](https://github.com/ardatan)! - If there are some fields depending on a nested
  type resolution, wait until it gets resolved then resolve the rest.

  See packages/federation/test/fixtures/complex-entity-call example for more details. You can see
  `ProductList` needs some fields from `Product` to resolve `first`

## 10.0.9

### Patch Changes

- [#6126](https://github.com/ardatan/graphql-tools/pull/6126)
  [`680351e`](https://github.com/ardatan/graphql-tools/commit/680351ee2af39ffd6b4b0048a28954d0d4b8a926)
  Thanks [@ardatan](https://github.com/ardatan)! - When there is a Node subschema, and others to
  resolve the rest of the entities by using a union resolver as in Federation like below, it was
  failing. This version fixes that issue.

  ```graphql
  query {
    node(id: "1") {
      id # Fetches from Node
      ... on User {
        name # Fetches from User
      }
    }
  }
  ```

  ```graphql
  type Query {
    node(id: ID!): Node
  }

  interface Node {
    id: ID!
  }

  type User implements Node {
    id: ID!
  }

  type Post implements Node {
    id: ID!
  }
  ```

  ```graphql
  # User subschema
  scalar _Any
  type Query {
    _entities(representations: [_Any!]!): [_Entity]!
  }
  union _Entity = User
  interface Node {
    id: ID!
  }
  type User implements Node {
    id: ID!
    name: String!
  }
  ```

  ```graphql
  # Post subschema
  scalar _Any
  union _Entity = Post
  type Query {
    _entities(representations: [_Any!]!): [_Entity]!
  }
  interface Node {
    id: ID!
  }
  type Post implements Node {
    id: ID!
    title: String!
  }
  ```

## 10.0.8

### Patch Changes

- [`4ce3ffc`](https://github.com/ardatan/graphql-tools/commit/4ce3ffc8ec927651587e0aa236fdd573e883ef21)
  Thanks [@ardatan](https://github.com/ardatan)! - Simplify the logic in `wrapConcreteTypes`

## 10.0.7

### Patch Changes

- [#6109](https://github.com/ardatan/graphql-tools/pull/6109)
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Merge list fields correctly

## 10.0.6

### Patch Changes

- [`af7be09`](https://github.com/ardatan/graphql-tools/commit/af7be099e88777bba376c14ecf191365ed3a89c7)
  Thanks [@ardatan](https://github.com/ardatan)! - Hotfix: do not use nullable and nonNullable
  prefixes if field names don't match

## 10.0.5

### Patch Changes

- [#6091](https://github.com/ardatan/graphql-tools/pull/6091)
  [`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4)
  Thanks [@User](https://github.com/User), [@User](https://github.com/User)! - If the gateway
  receives a query with an overlapping fields for the subschema, it uses aliases to resolve it
  correctly.

  Let's say subschema A has the following schema;

  ```graphql
    type Query {

    }

    interface User {
      id: ID!
      name: String!
    }

    type Admin implements User {
      id: ID!
      name: String!
      role: String!
    }

    type Customer implements User {
      id: ID!
      name: String
      email: String
    }
  ```

  And let's say the gateway has the following schema instead;

  ```graphql
    type Query {

    }

    interface User {
      id: ID!
      name: String!
    }

    type Admin implements User {
      id: ID!
      name: String!
      role: String!
    }

    type Customer implements User {
      id: ID!
      name: String!
      email: String!
    }
  ```

  In this case, the following query is fine for the gateway but for the subschema, it's not;

  ```graphql
  query {
    user {
      ... on Admin {
        id
        name # This is nullable in the subschema
        role
      }
      ... on Customer {
        id
        name # This is non-nullable in the subschema
        email
      }
    }
  }
  ```

  So the subgraph will throw based on this rule
  [OverlappingFieldsCanBeMerged](https://github.com/graphql/graphql-js/blob/main/src/validation/rules/OverlappingFieldsCanBeMergedRule.ts)

  To avoid this, the gateway will use aliases to resolve the query correctly. The query will be
  transformed to the following;

  ```graphql
  query {
    user {
      ... on Admin {
        id
        name # This is nullable in the subschema
        role
      }
      ... on Customer {
        id
        name: _nullable_name # This is non-nullable in the subschema
        email
      }
    }
  }
  ```

- [#6092](https://github.com/ardatan/graphql-tools/pull/6092)
  [`243c353`](https://github.com/ardatan/graphql-tools/commit/243c353412921cf0063f963ee46b9c63d2f33b41)
  Thanks [@ardatan](https://github.com/ardatan)! - If one of the subgraphs are already able to
  resolve a nested field as in `parent-entity-call` example's `Category.details` from C's `Product`,
  resolve it from there instead of using type merging.

  ```graphql
  query {
    product {
      category {
        details {
          # This is coming from C's Product, so resolve it from there instead of Type Merging
          id
          name
        }
      }
    }
  }
  ```

## 10.0.4

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/schema@^10.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.2)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.5`, in `dependencies`)

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - No unnecessary inline fragment spreads for
  union types

- Updated dependencies
  [[`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)]:
  - @graphql-tools/batch-execute@9.0.4
  - @graphql-tools/executor@1.2.1
  - @graphql-tools/schema@10.0.3

## 10.0.3

### Patch Changes

- [#5572](https://github.com/ardatan/graphql-tools/pull/5572)
  [`aadb591f`](https://github.com/ardatan/graphql-tools/commit/aadb591f8cd99560d7adba3d66a193434425b47d)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix for wrapping subscription types

## 10.0.2

### Patch Changes

- [#5477](https://github.com/ardatan/graphql-tools/pull/5477)
  [`cfd47827`](https://github.com/ardatan/graphql-tools/commit/cfd47827c0e625d1b1894e18260342576d6dd71d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Removed dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `dependencies`)

- [`a59fb765`](https://github.com/ardatan/graphql-tools/commit/a59fb765a1256b914f1728283d793d61b66bdf89)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations to get better performance in query
  planning

- Updated dependencies
  [[`a59fb765`](https://github.com/ardatan/graphql-tools/commit/a59fb765a1256b914f1728283d793d61b66bdf89)]:
  - @graphql-tools/batch-execute@9.0.1
  - @graphql-tools/utils@10.0.5

## 10.0.1

### Patch Changes

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations for federation

## 10.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- [`8fba6cc1`](https://github.com/ardatan/graphql-tools/commit/8fba6cc1876e914d587f5b253332aaedbcaa65e6)
  Thanks [@ardatan](https://github.com/ardatan)! - Workaround for empty results

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/batch-execute@9.0.0
  - @graphql-tools/executor@1.0.0
  - @graphql-tools/schema@10.0.0
  - @graphql-tools/utils@10.0.0

## 9.0.35

### Patch Changes

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

- Updated dependencies
  [[`88244048`](https://github.com/ardatan/graphql-tools/commit/882440487551abcb5bdd4f626f3b56ac2e886f11),
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)]:
  - @graphql-tools/executor@0.0.20
  - @graphql-tools/batch-execute@8.5.22

## 9.0.34

### Patch Changes

- [`2f342e43`](https://github.com/ardatan/graphql-tools/commit/2f342e430ba0d0097d1d8cb31a6abb97ed46f971)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use promises if not async

- Updated dependencies
  [[`2f342e43`](https://github.com/ardatan/graphql-tools/commit/2f342e430ba0d0097d1d8cb31a6abb97ed46f971)]:
  - @graphql-tools/batch-execute@8.5.21

## 9.0.33

### Patch Changes

- Updated dependencies
  [[`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0),
  [`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0),
  [`05c97eb8`](https://github.com/ardatan/graphql-tools/commit/05c97eb888cd4b1ffbd9adb32722cd5b609292a0),
  [`f24f018a`](https://github.com/ardatan/graphql-tools/commit/f24f018aa94394766f4201b1964d473d08946bd3)]:
  - @graphql-tools/batch-execute@8.5.20
  - @graphql-tools/executor@0.0.19
  - @graphql-tools/schema@9.0.19

## 9.0.32

### Patch Changes

- Updated dependencies
  [[`91a895be`](https://github.com/ardatan/graphql-tools/commit/91a895bea32dc4226da08e8981ded3f55f4c53f3)]:
  - @graphql-tools/executor@0.0.18

## 9.0.31

### Patch Changes

- Updated dependencies
  [[`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)]:
  - @graphql-tools/batch-execute@8.5.19
  - @graphql-tools/executor@0.0.17
  - @graphql-tools/schema@9.0.18

## 9.0.30

### Patch Changes

- Updated dependencies
  [[`828fbf93`](https://github.com/ardatan/graphql-tools/commit/828fbf93ff317d00577c9a94402736bac5f4be39)]:
  - @graphql-tools/executor@0.0.16

## 9.0.29

### Patch Changes

- [#5131](https://github.com/ardatan/graphql-tools/pull/5131)
  [`f26392a6`](https://github.com/ardatan/graphql-tools/commit/f26392a66299956da1e66253b181f85332c93db5)
  Thanks [@neumark](https://github.com/neumark)! - Create symbols with Symbol.for() because multiple
  copies of delegate cause stitching bugs otherwise.

## 9.0.28

### Patch Changes

- [#5067](https://github.com/ardatan/graphql-tools/pull/5067)
  [`492220cb`](https://github.com/ardatan/graphql-tools/commit/492220cbdf240e7abde23af0aabcb8cbc6fd3656)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/batch-execute@^8.5.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-execute/v/8.5.18)
    (from `8.5.18`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^0.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.14)
    (from `0.0.14`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^9.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/9.0.16)
    (from `9.0.16`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^9.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `9.2.1`, in `dependencies`)
  - Updated dependency [`dataloader@^2.2.2` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.2)
    (from `2.2.2`, in `dependencies`)
  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `~2.5.0`, in `dependencies`)
  - Updated dependency
    [`value-or-promise@^1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.12`, in `dependencies`)
- Updated dependencies
  [[`77c1002e`](https://github.com/ardatan/graphql-tools/commit/77c1002e2165a913508fb505513f9289db4f8cd3)]:
  - @graphql-tools/executor@0.0.15

## 9.0.27

### Patch Changes

- [#5055](https://github.com/ardatan/graphql-tools/pull/5055)
  [`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.2` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.2)
    (from `2.2.1`, in `dependencies`)
- Updated dependencies
  [[`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)]:
  - @graphql-tools/batch-execute@8.5.18

## 9.0.26

### Patch Changes

- [#5025](https://github.com/ardatan/graphql-tools/pull/5025)
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`dataloader@2.2.1` ↗︎](https://www.npmjs.com/package/dataloader/v/2.2.1)
    (from `2.1.0`, in `dependencies`)
- Updated dependencies
  [[`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155),
  [`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/batch-execute@8.5.17
  - @graphql-tools/utils@9.2.1
  - @graphql-tools/executor@0.0.14
  - @graphql-tools/schema@9.0.16

## 9.0.25

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0
  - @graphql-tools/batch-execute@8.5.16
  - @graphql-tools/executor@0.0.13
  - @graphql-tools/schema@9.0.15

## 9.0.24

### Patch Changes

- [#4995](https://github.com/ardatan/graphql-tools/pull/4995)
  [`772b948a`](https://github.com/ardatan/graphql-tools/commit/772b948ae536ac23520e704b33f450c94252f113)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`tslib@~2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `~2.4.0`, in `dependencies`)

## 9.0.23

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.14

## 9.0.22

### Patch Changes

- [#4943](https://github.com/ardatan/graphql-tools/pull/4943)
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`value-or-promise@1.0.12` ↗︎](https://www.npmjs.com/package/value-or-promise/v/1.0.12) (from
    `1.0.11`, in `dependencies`)
- Updated dependencies
  [[`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/batch-execute@8.5.15
  - @graphql-tools/executor@0.0.12
  - @graphql-tools/schema@9.0.13
  - @graphql-tools/utils@9.1.4

## 9.0.21

### Patch Changes

- [#4920](https://github.com/ardatan/graphql-tools/pull/4920)
  [`13177794`](https://github.com/ardatan/graphql-tools/commit/131777947d111e6a952d9e0e581fd651664101a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle type merging with union types correctly ->
  See https://github.com/ardatan/graphql-tools/issues/4902

## 9.0.20

### Patch Changes

- [#4890](https://github.com/ardatan/graphql-tools/pull/4890)
  [`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a)
  Thanks [@ardatan](https://github.com/ardatan)! - Transform provided argument values properly

- [#4890](https://github.com/ardatan/graphql-tools/pull/4890)
  [`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle argument definitions correctly during
  delegation and transformations

## 9.0.19

### Patch Changes

- [#4887](https://github.com/ardatan/graphql-tools/pull/4887)
  [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix handling variables

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3
  - @graphql-tools/batch-execute@8.5.14
  - @graphql-tools/executor@0.0.11
  - @graphql-tools/schema@9.0.12

## 9.0.18

### Patch Changes

- [`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix handling argument values in gateway request

- [`b5e6459f`](https://github.com/ardatan/graphql-tools/commit/b5e6459f87cd8720457ce9bff38f3dfa0cb3c150)
  Thanks [@ardatan](https://github.com/ardatan)! - Show warning only if DEBUG env var is present

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2
  - @graphql-tools/batch-execute@8.5.13
  - @graphql-tools/executor@0.0.10
  - @graphql-tools/schema@9.0.11

## 9.0.17

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1
  - @graphql-tools/batch-execute@8.5.12
  - @graphql-tools/executor@0.0.9
  - @graphql-tools/schema@9.0.10

## 9.0.16

### Patch Changes

- Updated dependencies
  [[`1d3856dc`](https://github.com/ardatan/graphql-tools/commit/1d3856dccaaafe2da96c91dd38dcce356bc734a3)]:
  - @graphql-tools/executor@0.0.8

## 9.0.15

### Patch Changes

- Updated dependencies
  [[`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/utils@9.1.0
  - @graphql-tools/batch-execute@8.5.11
  - @graphql-tools/executor@0.0.7
  - @graphql-tools/schema@9.0.9

## 9.0.14

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1
  - @graphql-tools/batch-execute@8.5.10
  - @graphql-tools/executor@0.0.6
  - @graphql-tools/schema@9.0.8

## 9.0.13

### Patch Changes

- Updated dependencies
  [[`79e5554b`](https://github.com/ardatan/graphql-tools/commit/79e5554b524d1404f70c932cb43bdd55869ddfff),
  [`185f1e97`](https://github.com/ardatan/graphql-tools/commit/185f1e9738fbd53a894948d769e827a6e9e0ff60)]:
  - @graphql-tools/executor@0.0.5

## 9.0.12

### Patch Changes

- Updated dependencies
  [[`f47f3559`](https://github.com/ardatan/graphql-tools/commit/f47f35593d4e5b785359f4d5dbdb2981156fecba)]:
  - @graphql-tools/executor@0.0.4

## 9.0.11

### Patch Changes

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796)
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)
  Thanks [@saihaj](https://github.com/saihaj)! - update `collectFields` to support collecting
  deffered values

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/executor@0.0.3
  - @graphql-tools/utils@9.0.0
  - @graphql-tools/batch-execute@8.5.9
  - @graphql-tools/schema@9.0.7

## 9.0.10

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175)]:
  - @graphql-tools/utils@8.13.1
  - @graphql-tools/batch-execute@8.5.8
  - @graphql-tools/executor@0.0.2
  - @graphql-tools/schema@9.0.6

## 9.0.9

### Patch Changes

- [#4778](https://github.com/ardatan/graphql-tools/pull/4778)
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/executor@0.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.0)
    (to `dependencies`)
- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/utils@8.13.0
  - @graphql-tools/executor@0.0.1
  - @graphql-tools/batch-execute@8.5.7
  - @graphql-tools/schema@9.0.5

## 9.0.8

### Patch Changes

- [`0402894d`](https://github.com/ardatan/graphql-tools/commit/0402894d0b2747ae5d98d28df9b39d6a06cc5f2a)
  Thanks [@ardatan](https://github.com/ardatan)! - Refactor resolveExternalValue

## 9.0.7

### Patch Changes

- [`00c4a1a4`](https://github.com/ardatan/graphql-tools/commit/00c4a1a44e14b9950f44d56f44967ab7a0121706)
  Thanks [@ardatan](https://github.com/ardatan)! - If type is a list but the provided value isn't,
  do not fail and resolve that value as the member of that list type

## 9.0.6

### Patch Changes

- Updated dependencies
  [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0
  - @graphql-tools/batch-execute@8.5.6
  - @graphql-tools/schema@9.0.4

## 9.0.5

### Patch Changes

- Updated dependencies
  [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f),
  [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0
  - @graphql-tools/batch-execute@8.5.5
  - @graphql-tools/schema@9.0.3

## 9.0.4

### Patch Changes

- Updated dependencies
  [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97)]:
  - @graphql-tools/utils@8.10.1
  - @graphql-tools/batch-execute@8.5.4
  - @graphql-tools/schema@9.0.2

## 9.0.3

### Patch Changes

- [`0555a972`](https://github.com/ardatan/graphql-tools/commit/0555a972f010d2b3ca93b9164b26474a78d0b20b)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump versions

## 9.0.2

### Patch Changes

- [#4648](https://github.com/ardatan/graphql-tools/pull/4648)
  [`29ee7542`](https://github.com/ardatan/graphql-tools/commit/29ee7542649e9c938bdb9c751bd3a2f56d17cb55)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not call `Transform.transformSchema` more than
  once

## 9.0.1

### Patch Changes

- Updated dependencies
  [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0
  - @graphql-tools/schema@9.0.1
  - @graphql-tools/batch-execute@8.5.3

## 9.0.0

### Major Changes

- [#4566](https://github.com/ardatan/graphql-tools/pull/4566)
  [`d8dc67aa`](https://github.com/ardatan/graphql-tools/commit/d8dc67aa6cb05bf10f5f16e90690e5ccc87b3426)
  Thanks [@ardatan](https://github.com/ardatan)! - ## Breaking changes

  **Schema generation optimization by removing `transfomedSchema` parameter**

  Previously we were applying the transforms multiple times. We needed to introduced some breaking
  changes to improve the initial wrapped/stitched schema generation performance;

  - `Transform.transformSchema` no longer accepts `transformedSchema` which can easily be created
    with `applySchemaTransforms(schema, subschemaConfig)` instead.
  - Proxying resolver factory function that is passed as `createProxyingResolver` to
    `SubschemaConfig` no longer takes `transformedSchema` which can easily be created with
    `applySchemaTransforms(schema, subschemaConfig)` instead.

  **`stitchSchemas` doesn't take nested arrays of subschemas**

  `stitchSchemas` no longer accepts an array of arrays of subschema configuration objects. Instead,
  it accepts an array of subschema configuration objects or schema objects directly.

  **`stitchSchemas` no longer prunes the schema with `pruningOptions`**

  You can use `pruneSchema` from `@graphql-tools/utils` to prune the schema instead.

  **`stitchSchemas` no longer respect "@computed" directive if stitchingDirectivesTransformer isn't
  applied**

  Also `@graphql-tools/stitch` no longer exports `computedDirectiveTransformer` and
  `defaultSubschemaConfigTransforms`. Instead, use `@graphql-tools/stitching-directives` package for
  `@computed` directive.
  [Learn more about setting it up](https://www.graphql-tools.com/docs/schema-stitching/stitch-directives-sdl#directives-glossary)

  **`computedFields` has been removed from the merged type configuration**

  `MergeTypeConfig.computedFields` setting has been removed in favor of new computed field
  configuration written as:

  ```js
  merge: {
    MyType: {
      fields: {
        myComputedField: {
          selectionSet: '{ weight }',
          computed: true,
        }
      }
    }
  }
  ```

  A field-level `selectionSet` specifies field dependencies while the `computed` setting structures
  the field in a way that assures it is always selected with this data provided. The `selectionSet`
  is intentionally generic to support possible future uses. This new pattern organizes all
  field-level configuration (including `canonical`) into a single structure.

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`8cc8721f`](https://github.com/ardatan/graphql-tools/commit/8cc8721fbbff3c978fd67d162df833d6973c1860),
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/schema@9.0.0
  - @graphql-tools/batch-execute@8.5.2
  - @graphql-tools/utils@8.9.1

## 8.8.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/batch-execute@8.5.1
  - @graphql-tools/schema@8.5.1

## 8.8.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/batch-execute@8.5.0
  - @graphql-tools/schema@8.5.0

## 8.7.12

### Patch Changes

- 6df204de: Remove graphql-executor to have smaller bundle size
- Updated dependencies [4914970b]
  - @graphql-tools/schema@8.4.0
  - @graphql-tools/utils@8.7.0
  - @graphql-tools/batch-execute@8.4.11

## 8.7.11

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/batch-execute@8.4.10
  - @graphql-tools/schema@8.3.14
  - @graphql-tools/utils@8.6.13

## 8.7.10

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/batch-execute@8.4.9
  - @graphql-tools/schema@8.3.13

## 8.7.9

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/batch-execute@8.4.8
  - @graphql-tools/schema@8.3.12

## 8.7.8

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/batch-execute@8.4.7
  - @graphql-tools/schema@8.3.11

## 8.7.7

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/batch-execute@8.4.6
  - @graphql-tools/schema@8.3.10

## 8.7.6

### Patch Changes

- 26e4b464: relax subschema error path check

  ...as (apparently) some implementations may return path as `null` rather than not returning a
  path.

## 8.7.5

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/batch-execute@8.4.5
  - @graphql-tools/schema@8.3.9

## 8.7.4

### Patch Changes

- 0bbb1769: Refine generic typings using `extends X` when appropriate

  Typescript 4.7 has stricter requirements around generics which is explained well in the related
  PR: https://github.com/microsoft/TypeScript/pull/48366

  These changes resolve the errors that these packages will face when attempting to upgrade to TS
  4.7 (still in beta at the time of writing this). Landing these changes now will allow other TS
  libraries which depend on these packages to experiment with TS 4.7 in the meantime.

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7
  - @graphql-tools/batch-execute@8.4.4
  - @graphql-tools/schema@8.3.8

## 8.7.3

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch
- Updated dependencies [fe9402af]
  - @graphql-tools/batch-execute@8.4.3

## 8.7.2

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/batch-execute@8.4.2
  - @graphql-tools/schema@8.3.7

## 8.7.1

### Patch Changes

- Updated dependencies [722abad7]
  - @graphql-tools/schema@8.3.6

## 8.7.0

### Minor Changes

- d8fd6b94: enhance(delegate): use graphql-executor for subscriptions

## 8.6.1

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/batch-execute@8.4.1
  - @graphql-tools/schema@8.3.5

## 8.6.0

### Minor Changes

- c40e801f: feat: forward gateway operation's name to subschema executors

### Patch Changes

- Updated dependencies [c40e801f]
- Updated dependencies [d36d530b]
  - @graphql-tools/batch-execute@8.4.0
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/schema@8.3.4

## 8.5.4

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/batch-execute@8.3.3
  - @graphql-tools/schema@8.3.3

## 8.5.3

### Patch Changes

- 70081f8f: enhance(delegate): type is now inferred from the transformed subschema instead of
  unified schema
- 70081f8f: enhance(stitch): support promises in key functions

## 8.5.2

### Patch Changes

- b84a7809: fix(delegate): do not resolve the type twice

## 8.5.1

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/batch-execute@8.3.2
  - @graphql-tools/schema@8.3.2
  - @graphql-tools/utils@8.6.2

## 8.5.0

### Minor Changes

- 081b97e8: Add better type support for stitchSchemas using subschema transformations

## 8.4.3

### Patch Changes

- 51315610: enhance: avoid using globalThis
- Updated dependencies [51315610]
  - @graphql-tools/utils@8.5.4

## 8.4.2

### Patch Changes

- 960e178a: fix: isAsyncIterable should check if it is an object with iterator factory function
- Updated dependencies [960e178a]
- Updated dependencies [947a3fe0]
  - @graphql-tools/utils@8.5.3

## 8.4.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/batch-execute@8.3.1
  - @graphql-tools/schema@8.3.1
  - @graphql-tools/utils@8.5.1

## 8.4.0

### Minor Changes

- ad04dc79: enhance: make operationType optional

### Patch Changes

- Updated dependencies [ad04dc79]
  - @graphql-tools/batch-execute@8.3.0
  - @graphql-tools/utils@8.5.0

## 8.3.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/batch-execute@8.2.0
  - @graphql-tools/schema@8.3.0
  - @graphql-tools/utils@8.4.0

## 8.2.3

### Patch Changes

- 58262be7: enhance: show more clear error messages for aggregated error
- Updated dependencies [58262be7]
  - @graphql-tools/utils@8.3.0

## 8.2.2

### Patch Changes

- 014937db: batch-execute enhancements:
  - fixes bugs with batched fragment definitions
  - unpathed errors are now returned for all batch results
  - the "graphqlTools" prefix is simplified down to just "\_"
  - new tests and documentation
- Updated dependencies [014937db]
  - @graphql-tools/batch-execute@8.1.1
  - @graphql-tools/utils@8.2.4

## 8.2.1

### Patch Changes

- b2f18d6f: fix(delegate): pass an empty array if fieldNodes is falsy

## 8.2.0

### Minor Changes

- c5b0719c: enhance(utils): copy inspect util from graphql-js
- c5b0719c: feat: GraphQL v16 support
- c5b0719c: enhance(utils): move memoize functions to utils
- c5b0719c: enhance(utils): copy collectFields from graphql-js@16 for backwards compat

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0
  - @graphql-tools/batch-execute@8.1.0
  - @graphql-tools/schema@8.2.0

## 8.1.1

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- Updated dependencies [c8c13ed1]
  - @graphql-tools/utils@8.1.2

## 8.1.0

### Minor Changes

- 631b11bd: refactor(delegationPlanner): introduce static version of our piecemeal planner

  ...which, although undocumented, can be accessed within the StitchingInfo object saved in a
  stitched schema's extensions.

  Also improves memoization technique slightly across the board.

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/batch-execute@8.0.5
  - @graphql-tools/schema@8.1.2

## 8.0.10

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/batch-execute@8.0.4
  - @graphql-tools/schema@8.1.1

## 8.0.9

### Patch Changes

- 9a13357c: Fix nested type merges with repeated children ignore all but first occurrence

## 8.0.8

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/schema@8.1.0
  - @graphql-tools/batch-execute@8.0.3

## 8.0.7

### Patch Changes

- d47dcf42: fix(delegate): visit list values to collect variables

## 8.0.6

### Patch Changes

- ded29f3d: fix(delegate): collect variables from directives on FragmentSpread

## 8.0.5

### Patch Changes

- 7fdef335: fix(delegate): handle variables correctly

## 8.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/batch-execute@8.0.2
  - @graphql-tools/schema@8.0.2

## 8.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/batch-execute@8.0.1
  - @graphql-tools/schema@8.0.1

## 8.0.2

### Patch Changes

- d93945fa: fix(delegate): ignore if stitchingInfo is not in extensions

## 8.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import

## 8.0.0

### Major Changes

- 7d3e3006: BREAKING CHANGE
  - Remove `rootValue` from subschemaConfig
  - - Pass it through `ExecutionParams` or delegation options
  - Do not pass `info.rootValue` if `rootValue` is falsy
- d53e3be5: BREAKING CHANGES;

  Refactor the core delegation transforms into individual functions to modify request and results.
  This will improve the performance considerably by reducing the number of visits over the request
  document.

  - Replace `CheckResultAndHandleErrors` with `checkResultAndHandleErrors`
  - Remove `delegationBindings`
  - Replace `AddArgumentsAsVariables`, `AddSelectionSets`, `AddTypenameToAbstract`,
    `ExpandAbstractTypes`, `FilterToSchema`, `VisitSelectionSets` and `WrapConcreteTypes` with
    `prepareGatewayDocument` and `finalizeGatewayRequest`

- dae6dc7b: refactor: ExecutionParams type replaced by Request type

  rootValue property is now a part of the Request type.

  When delegating with delegateToSchema, rootValue can be set multiple ways:

  - when using a custom executor, the custom executor can utilize a rootValue in whichever custom
    way it specifies.
  - when using the default executor (execute/subscribe from graphql-js): -- rootValue can be passed
    to delegateToSchema via a named option -- rootValue can be included within a subschemaConfig --
    otherwise, rootValue is inferred from the originating schema

  When using wrapSchema/stitchSchemas, a subschemaConfig can specify the createProxyingResolver
  function which can pass whatever rootValue it wants to delegateToSchema as above.

- c42e811d: BREAKING CHANGES;

  - Rename `Request` to `ExecutionRequest`
  - Add required `operationType: OperationTypeNode` field in `ExecutionRequest`
  - Add `context` in `createRequest` and `createRequestInfo` instead of `delegateToSchema`

  > It doesn't rely on info.operation.operationType to allow the user to call an operation from
  > different root type. And it doesn't call getOperationAST again and again to get operation type
  > from the document/operation because we have it in Request and ExecutionParams
  > https://github.com/ardatan/graphql-tools/pull/3166/files#diff-d4824895ea613dcc1f710c3ac82e952fe0ca12391b671f70d9f2d90d5656fdceR38

  Improvements;

  - Memoize `defaultExecutor` for a single `GraphQLSchema` so allow `getBatchingExecutor` to memoize
    `batchingExecutor` correctly.
  - And there is no different `defaultExecutor` is created for `subscription` and other operation
    types. Only one executor is used.

  > Batch executor is memoized by `executor` reference but `createDefaultExecutor` didn't memoize
  > the default executor so this memoization wasn't working correctly on `batch-execute` side.
  > https://github.com/ardatan/graphql-tools/blob/remove-info-executor/packages/batch-execute/src/getBatchingExecutor.ts#L9

- 7d3e3006: BREAKING CHANGE
  - Now it uses the native
    [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)
    implementation. The major difference is the individual errors are kept under `errors` property
    instead of the object itself with `Symbol.iterator`.
  ```js
  // From;
  for (const error of aggregateError)
  // To;
  for (const error of aggregateError.errors)
  ```
- aa43054d: BREAKING CHANGE: validations are skipped by default, use validateRequest: true to
  reenable
- c0ca3190: BREAKING CHANGE
  - Remove Subscriber and use only Executor
  - - Now `Executor` can receive `AsyncIterable` and subscriptions will also be handled by
      `Executor`. This is a future-proof change for defer, stream and live queries

### Patch Changes

- Updated dependencies [af9a78de]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [7d3e3006]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/schema@8.0.0
  - @graphql-tools/batch-execute@8.0.0

## 7.1.5

### Patch Changes

- 22a9f3da: fix(deps): follow package conventions on when to pin
- Updated dependencies [22a9f3da]
  - @graphql-tools/batch-execute@7.1.2
  - @graphql-tools/schema@7.1.5

## 7.1.4

### Patch Changes

- 61da3e82: use value-or-promise to streamline working with sync values or async promises
- Updated dependencies [61da3e82]
  - @graphql-tools/batch-execute@7.1.1
  - @graphql-tools/schema@7.1.4

## 7.1.3

### Patch Changes

- b202587b: fix(delegate): handle executor errors

## 7.1.2

### Patch Changes

- 6aed1714: Allows `MergedTypeConfig` to be written with an `entryPoints` array for multiple merged
  type entry points, each with their own `fieldName` and `selectionSet`:

  ```js
  {
    schema: testSchema,
    merge: {
      Product: {
        entryPoints: [{
          selectionSet: '{ id }',
          fieldName: 'productById',
          key: ({ id, price, weight }) => ({ id, price, weight }),
          argsFromKeys: (key) => ({ key }),
        }, {
          selectionSet: '{ upc }',
          fieldName: 'productByUpc',
          key: ({ upc, price, weight }) => ({ upc, price, weight }),
          argsFromKeys: (key) => ({ key }),
        }],
      }
    }
  }
  ```

  These multiple entry points accommodate types with multiple keys across services that rely on a
  central service to join them, for example:

  - Catalog service: `type Product { upc }`
  - Vendors service: `type Product { upc id }`
  - Reviews service: `type Product { id }`

  Given this graph, the possible traversals require the Vendors service to provide entry points for
  each unique key format:

  - `Catalog > Vendors > Reviews`
  - `Catalog < Vendors > Reviews`
  - `Catalog < Vendors < Reviews`

  Is it highly recommended that you enable query batching for subschemas with multiple entry points.

## 7.1.1

### Patch Changes

- f84e7b15: fix(delegate): export executor typings not to have breaking change
- Updated dependencies [194ac370]
  - @graphql-tools/utils@7.7.1

## 7.1.0

### Minor Changes

- 58fd4b28: feat(types): add TContext to stitchSchemas and executor

### Patch Changes

- Updated dependencies [58fd4b28]
- Updated dependencies [43da6b59]
  - @graphql-tools/batch-execute@7.1.0
  - @graphql-tools/utils@7.7.0

## 7.0.10

### Patch Changes

- 24926654: Deprecates the `MergeTypeConfig.computedFields` setting (with backwards-compatible
  warning) in favor of new computed field configuration written as:

  ```js
  merge: {
    MyType: {
      fields: {
        myComputedField: {
          selectionSet: '{ weight }',
          computed: true,
        }
      }
    }
  }
  ```

  A field-level `selectionSet` specifies field dependencies while the `computed` setting structures
  the field in a way that assures it is always selected with this data provided. The `selectionSet`
  is intentionally generic to support possible future uses. This new pattern organizes all
  field-level configuration (including `canonical`) into a single structure.

## 7.0.9

### Patch Changes

- d9b82a2e: fix(delegate) fix array check
- d9b82a2e: enhance(stitch) canonical merged type and field definitions. Use the @canonical
  directive to promote preferred type and field descriptions into the combined gateway schema.

## 7.0.8

### Patch Changes

- cd5da458: fix(stitch): type merging for nested root types

  Because root types do not usually require selectionSets, a nested root type proxied to a remote
  service may end up having an empty selectionSet, if the nested root types only includes fields
  from a different subservice.

  Empty selection sets return null, but, in this case, it should return an empty object. We can
  force this behavior by including the \_\_typename field which exists on every schema.

  Addresses #2347.

  In the future, we may want to include short-circuiting behavior that when delegating to composite
  fields, if an empty selection set is included, an empty object is returned rather than null. This
  short-circuiting behavior would be complex for lists, as it would be unclear the length of the
  list...

- cd5da458: fix(delegate): resolve external values only once

  Because items in a list may be identical and the defaultMergedResolver mutates those objects when
  resolving them as external values, a check is required so that the mutation happens only once.

  Partially addresses #2304

- Updated dependencies [cd5da458]
  - @graphql-tools/utils@7.1.6

## 7.0.7

### Patch Changes

- 1b730f80: fix(typeMerging): enable subschemas to use keys that have been renamed via transforms
- 29ead57c: fix(batch-delegate): proxy batched errors

## 7.0.6

### Patch Changes

- d40c0a84: fix(delegate): add selectionSets prior to expanding abstract types

## 7.0.5

### Patch Changes

- e50f80a3: enhance(stitch): custom merge resolvers

## 7.0.4

### Patch Changes

- 83b8e428: fix(delegate): import AggregateError polyfill (#2196)

## 7.0.3

### Patch Changes

- 856e23fa: fix(delegate): WrapConcreteTypes should not process fragments that are not on a root
  type (#2173)
- Updated dependencies [e3176633]
  - @graphql-tools/utils@7.0.2

## 7.0.2

### Patch Changes

- 718eda30: fix(stitch): fix mergeExternalObject regressions

  v7 introduced a regression in the merging of ExternalObjects that causes type merging to fail when
  undergoing multiple rounds of merging.

## 7.0.1

### Patch Changes

- 294dedda: fix(delegate): Fix type error with `arguments` being undefined
- Updated dependencies [8133a907]
- Updated dependencies [2b6c813e]
  - @graphql-tools/utils@7.0.1

## 7.0.0

### Major Changes

- be1a1575: ## Breaking Changes:

  #### Schema Generation and Decoration API (`@graphql-tools/schema`)

  - Resolver validation options should now be set to `error`, `warn` or `ignore` rather than `true`
    or `false`. In previous versions, some of the validators caused errors to be thrown, while some
    issued warnings. This changes brings consistency to validator behavior.

  - The `allowResolversNotInSchema` has been renamed to `requireResolversToMatchSchema`, to
    harmonize the naming convention of all the validators. The default setting of
    `requireResolversToMatchSchema` is `error`, matching the previous behavior.

  #### Schema Delegation (`delegateToSchema` & `@graphql-tools/delegate`)

  - The `delegateToSchema` return value has matured and been formalized as an `ExternalObject`, in
    which all errors are integrated into the GraphQL response, preserving their initial path. Those
    advanced users accessing the result directly will note the change in error handling. This also
    allows for the deprecation of unnecessary helper functions including `slicedError`, `getErrors`,
    `getErrorsByPathSegment` functions. Only external errors with missing or invalid paths must
    still be preserved by annotating the remote object with special properties. The new
    `getUnpathedErrors` function is therefore necessary for retrieving only these errors. Note also
    the new `annotateExternalObject` and `mergeExternalObjects` functions, as well as the renaming
    of `handleResult` to `resolveExternalValue`.

  - Transform types and the `applySchemaTransforms` are now relocated to the `delegate` package;
    `applyRequestTransforms`/`applyResultTransforms` functions have been deprecated, however, as
    this functionality has been replaced since v6 by the `Transformer` abstraction.

  - The `transformRequest`/`transformResult` methods are now provided additional `delegationContext`
    and `transformationContext` arguments -- these were introduced in v6, but previously optional.

  - The `transformSchema` method may wish to create additional delegating resolvers and so it is now
    provided the `subschemaConfig` and final (non-executable) `transformedSchema` parameters. As in
    v6, the `transformSchema` is kicked off once to produce the non-executable version, and then, if
    a wrapping schema is being generated, proxying resolvers are created with access to the
    (non-executable) initial result. In v7, the individual `transformSchema` methods also get access
    to the result of the first run, if necessary, they can create additional wrapping schema
    proxying resolvers.

  - `applySchemaTransforms` parameters have been updated to match and support the `transformSchema`
    parameters above.

  #### Remote Schemas & Wrapping (`wrapSchema`, `makeRemoteExecutableSchema`, and `@graphql-tools/wrap`)

  - `wrapSchema` and `generateProxyingResolvers` now only take a single options argument with named
    properties of type `SubschemaConfig`. The previously possible shorthand version with first
    argument consisting of a `GraphQLSchema` and second argument representing the transforms should
    be reworked as a `SubschemaConfig` object.

  - Similarly, the `ICreateProxyingResolverOptions` interface that provides the options for the
    `createProxyingResolver` property of `SubschemaConfig` options has been adjusted. The `schema`
    property previously could be set to a `GraphQLSchema` or a `SubschemaConfig` object. This
    property has been removed in favor of a `subschemaConfig` property that will always be a
    `SubschemaConfig` object. The `transforms` property has been removed; transforms should be
    included within the `SubschemaConfig` object.`

  - The format of the wrapping schema has solidified. All non-root fields are expected to use
    identical resolvers, either `defaultMergedResolver` or a custom equivalent, with root fields
    doing the hard work of proxying. Support for custom merged resolvers throught
    `createMergedResolver` has been deprecated, as custom merging resolvers conflicts when using
    stitching's type merging, where resolvers are expected to be identical across subschemas.

  - The `WrapFields` transform's `wrappingResolver` option has been removed, as this complicates
    multiple wrapping layers, as well as planned functionality to wrap subscription root fields in
    potentially multiple layers, as the wrapping resolvers may be different in different layers.
    Modifying resolvers can still be performed by use of an additional transform such as
    `TransformRootFields` or `TransformObjectFields`.

  - The `ExtendSchema` transform has been removed, as it is conceptually simpler just to use
    `stitchSchemas` with one subschema.

  - The `ReplaceFieldsWithFragment`, `AddFragmentsByField`, `AddSelectionSetsByField`, and
    `AddMergedTypeSelectionSets` transforms has been removed, as they are superseded by the
    `AddSelectionSets` and `VisitSelectionSets` transforms. The `AddSelectionSets` purposely takes
    parsed SDL rather than strings, to nudge end users to parse these strings at build time (when
    possible), rather than at runtime. Parsing of selection set strings can be performed using the
    `parseSelectionSet` function from `@graphql-tools/utils`.

  #### Schema Stitching (`stitchSchemas` & `@graphql-tools/stitch`)

  - `stitchSchemas`'s `mergeTypes` option is now true by default! This causes the `onTypeConflict`
    option to be ignored by default. To use `onTypeConflict` to select a specific type instead of
    simply merging, simply set `mergeTypes` to false.

  - `schemas` argument has been deprecated, use `subschemas`, `typeDefs`, or `types`, depending on
    what you are stitching.

  - When using batch delegation in type merging, the `argsFromKeys` function is now set only via the
    `argsFromKeys` property. Previously, if `argsFromKeys` was absent, it could be read from `args`.

  - Support for fragment hints has been removed in favor of selection set hints.

  - `stitchSchemas` now processes all `GraphQLSchema` and `SubschemaConfig` subschema input into new
    `Subschema` objects, handling schema config directives such aso`@computed` as well as generating
    the final transformed schema, stored as the `transformedSchema` property, if transforms are
    used. Signatures of the `onTypeConflict`, `fieldConfigMerger`, and `inputFieldConfigMerger` have
    been updated to include metadata related to the original and transformed subschemas. Note the
    property name change for `onTypeConflict` from `schema` to `subschema`.

  #### Mocking (`addMocksToSchema` and `@graphql-tools/mock`)

  - Mocks returning objects with fields set as functions are now operating according to upstream
    graphql-js convention, i.e. these functions take three arguments, `args`, `context`, and `info`
    with `parent` available as `this` rather than as the first argument.

  #### Other Utilities (`@graphql-tools/utils`)

  - `filterSchema`'s `fieldFilter` will now filter _all_ fields across Object, Interface, and Input
    types. For the previous Object-only behavior, switch to the `objectFieldFilter` option.
  - Unused `fieldNodes` utility functions have been removed.
  - Unused `typeContainsSelectionSet` function has been removed, and `typesContainSelectionSet` has
    been moved to the `stitch` package.
  - Unnecessary `Operation` type has been removed in favor of `OperationTypeNode` from upstream
    graphql-js.
  - As above, `applySchemaTransforms`/`applyRequestTransforms`/`applyResultTransforms` have been
    removed from the `utils` package, as they are implemented elsewhere or no longer necessary.

  ## Related Issues

  - proxy all the errors: #1047, #1641
  - better error handling for merges #2016, #2062
  - fix typings #1614
  - disable implicit schema pruning #1817
  - mocks not working for functions #1807

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/batch-execute@7.0.0
  - @graphql-tools/schema@7.0.0
  - @graphql-tools/utils@7.0.0

## 6.2.4

### Patch Changes

- 32c3c4f8: enhance(stitching): improve error message for unknown types
- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/schema@6.2.4
