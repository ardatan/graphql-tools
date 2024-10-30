# @graphql-tools/stitch

## 9.2.17

### Patch Changes

- Updated dependencies
  [[`f470f49`](https://github.com/ardatan/graphql-tools/commit/f470f49f7d8445801a2983f14532124588f9f59e)]:
  - @graphql-tools/delegate@10.0.28
  - @graphql-tools/batch-delegate@9.0.10
  - @graphql-tools/wrap@10.0.12

## 9.2.16

### Patch Changes

- [`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid extra calls if the keys are already
  resolved

- Updated dependencies
  [[`180f3f0`](https://github.com/ardatan/graphql-tools/commit/180f3f0c8362613eb3013ff12f2d5405cd987903)]:
  - @graphql-tools/delegate@10.0.27
  - @graphql-tools/batch-delegate@9.0.9
  - @graphql-tools/wrap@10.0.11

## 9.2.15

### Patch Changes

- Updated dependencies
  [[`8effad4`](https://github.com/ardatan/graphql-tools/commit/8effad4ffb9be1bca098b8cb6ce41b84ac7d9b6b)]:
  - @graphql-tools/delegate@10.0.26
  - @graphql-tools/batch-delegate@9.0.8
  - @graphql-tools/wrap@10.0.10

## 9.2.14

### Patch Changes

- Updated dependencies
  [[`8a16b01`](https://github.com/ardatan/graphql-tools/commit/8a16b01296457bdcfbb111e02b6f6569ef8b04aa)]:
  - @graphql-tools/delegate@10.0.25
  - @graphql-tools/batch-delegate@9.0.7
  - @graphql-tools/wrap@10.0.9

## 9.2.13

### Patch Changes

- Updated dependencies
  [[`4cdb462`](https://github.com/ardatan/graphql-tools/commit/4cdb46248774f2d5ae2757d40e1d55e83d7413b3)]:
  - @graphql-tools/delegate@10.0.24
  - @graphql-tools/batch-delegate@9.0.6
  - @graphql-tools/wrap@10.0.8

## 9.2.12

### Patch Changes

- [#6573](https://github.com/ardatan/graphql-tools/pull/6573)
  [`7e2938d`](https://github.com/ardatan/graphql-tools/commit/7e2938d45c6d0a6eb6b18b89f9f80e9b5b5c08db)
  Thanks [@ardatan](https://github.com/ardatan)! - When there are two services like below then the
  following query senty, the gateway tries to fetch `id` as an extra field because it considers `id`
  might be needed while this is not correct. This patch avoids any extra calls, and forwards the
  query as is to the 2nd service.

  ```graphql
  query {
    viewer {
      booksContainer(input: $input) {
        edges {
          cursor
          node {
            source {
              # Book(upc=)
              upc
            }
          }
        }
        pageInfo {
          endCursor
        }
      }
    }
  }
  ```

  ```graphql
  type Book @key(fields: "id") @key(fields: "upc") {
    id: ID!
    upc: ID!
  }
  ```

  ```graphql
  type BookContainer { # the type that is used in a collection
    id: ID!
    # ... other stuff here
    source: Book!
  }

  type Book @key(fields: "upc") {
    upc: ID!
  }

  type Query {
    viewer: Viewer
  }

  type Viewer {
    booksContainer: BooksContainerResult
  }

  type BooksContainerResult {
    edges: [BooksContainerEdge!]!
    pageInfo: PageInfo!
  }

  type BooksContainerEdge {
    node: BookContainer!
    cursor: String!
  }

  type PageInfo {
    endCursor: String
  }
  ```

- Updated dependencies
  [[`7e2938d`](https://github.com/ardatan/graphql-tools/commit/7e2938d45c6d0a6eb6b18b89f9f80e9b5b5c08db)]:
  - @graphql-tools/delegate@10.0.23
  - @graphql-tools/batch-delegate@9.0.5
  - @graphql-tools/wrap@10.0.7

## 9.2.11

### Patch Changes

- [#6543](https://github.com/ardatan/graphql-tools/pull/6543)
  [`dcb3e27`](https://github.com/ardatan/graphql-tools/commit/dcb3e276cce59340596156542bcede9d8b143d44)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Isolate computed fields return objects only
  if not referenced from other, non-isolated, objects

- Updated dependencies
  [[`cf2ce5e`](https://github.com/ardatan/graphql-tools/commit/cf2ce5ed4773087cc324599f2812f4fb91398b21)]:
  - @graphql-tools/utils@10.5.5
  - @graphql-tools/batch-delegate@9.0.4
  - @graphql-tools/delegate@10.0.22
  - @graphql-tools/executor@1.3.2
  - @graphql-tools/merge@9.0.8
  - @graphql-tools/schema@10.0.7
  - @graphql-tools/wrap@10.0.6

## 9.2.10

### Patch Changes

- [#6278](https://github.com/ardatan/graphql-tools/pull/6278)
  [`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle `@defer`

- [#6293](https://github.com/ardatan/graphql-tools/pull/6293)
  [`3f301dc`](https://github.com/ardatan/graphql-tools/commit/3f301dc74a99ea1db28fe75923fa26ba2736d9f7)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not apply isolation for Mutation fields

- Updated dependencies
  [[`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c),
  [`74f995f`](https://github.com/ardatan/graphql-tools/commit/74f995f17dfea6385e08bcdd662e7ad6fcfb5dfa)]:
  - @graphql-tools/delegate@10.0.12
  - @graphql-tools/utils@10.2.3
  - @graphql-tools/executor@1.2.8

## 9.2.9

### Patch Changes

- [#6194](https://github.com/ardatan/graphql-tools/pull/6194)
  [`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface objects in a different way

- [#6180](https://github.com/ardatan/graphql-tools/pull/6180)
  [`eec9d3d`](https://github.com/ardatan/graphql-tools/commit/eec9d3d86a1a0a748321263ef9bc4db13fd3c35c)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle nested dependencies in the computed fields

  ```ts
  {
    merge: {
      Product: {
        selectionSet: '{ id }',
        fields: {
          isExpensive: {
            selectionSet: '{ price }',
            computed: true,
          },
          canAfford: {
            selectionSet: '{ isExpensive }',
            computed: true,
          },
        }
      }
    }
  }
  ```

- [#6179](https://github.com/ardatan/graphql-tools/pull/6179)
  [`03a47b1`](https://github.com/ardatan/graphql-tools/commit/03a47b181516e17f33c84f364df9482c2d1ba502)
  Thanks [@ardatan](https://github.com/ardatan)! - Support computed fields resolved via a root field
  returning an interface When a computed field returning an object, and that field is resolved via
  an interface, the computed field will now be resolved correctly.

- [#6188](https://github.com/ardatan/graphql-tools/pull/6188)
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle nested selections in
  `calculateSelectionScore`

- [#6175](https://github.com/ardatan/graphql-tools/pull/6175)
  [`0827497`](https://github.com/ardatan/graphql-tools/commit/08274975ccb1524d88fc8b95f42deb1cba05425d)
  Thanks [@ardatan](https://github.com/ardatan)! - If there is a subschema with some selection set,
  and another with some other selection set. After the calculation of delegation stage, if one
  subschema can cover the other selection set as well, then we can merge the two selection sets into
  one, and remove the other subschema from the stage.
- Updated dependencies
  [[`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1),
  [`0134f7f`](https://github.com/ardatan/graphql-tools/commit/0134f7ffe5383603961d69337bfa5bceefb3ed74)]:
  - @graphql-tools/batch-delegate@9.0.3
  - @graphql-tools/delegate@10.0.11
  - @graphql-tools/schema@10.0.4
  - @graphql-tools/utils@10.2.1

## 9.2.8

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

- [#6141](https://github.com/ardatan/graphql-tools/pull/6141)
  [`cd962c1`](https://github.com/ardatan/graphql-tools/commit/cd962c1048b21c0a6f91c943860089b050ac5f5e)
  Thanks [@ardatan](https://github.com/ardatan)! - When the gateway receives the query, now it
  chooses the best root field if there is the same root field in different subgraphs. For example,
  if there is `node(id: ID!): Node` in all subgraphs but one implements `User` and the other
  implements `Post`, the gateway will choose the subgraph that implements `User` or `Post` based on
  the query.

  If there is a unresolvable interface field, it throws.

  See
  [this supergraph and the test query](https://github.com/ardatan/graphql-tools/tree/master/packages/federation/test/fixtures/federation-compatibility/corrupted-supergraph-node-id)
  to see a real-life example

- Updated dependencies
  [[`a83da08`](https://github.com/ardatan/graphql-tools/commit/a83da087e24929ed0734a2cff63c97bd45cc9eb4),
  [`fc9c71f`](https://github.com/ardatan/graphql-tools/commit/fc9c71fbc9057a8e32e0d8813b23819c631afa65)]:
  - @graphql-tools/delegate@10.0.10

## 9.2.7

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

- Updated dependencies
  [[`680351e`](https://github.com/ardatan/graphql-tools/commit/680351ee2af39ffd6b4b0048a28954d0d4b8a926)]:
  - @graphql-tools/delegate@10.0.9

## 9.2.6

### Patch Changes

- [`98b2795`](https://github.com/ardatan/graphql-tools/commit/98b2795120e05dec1d91b57422f50d38c088b630)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on unavailable field selection, and
  key object projection

## 9.2.5

### Patch Changes

- [`9238e14`](https://github.com/ardatan/graphql-tools/commit/9238e140862d33c6df072c42054fc642eda37840)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on field merging and extraction of
  unavailable fields

- Updated dependencies
  [[`4ce3ffc`](https://github.com/ardatan/graphql-tools/commit/4ce3ffc8ec927651587e0aa236fdd573e883ef21)]:
  - @graphql-tools/delegate@10.0.8

## 9.2.4

### Patch Changes

- [#6117](https://github.com/ardatan/graphql-tools/pull/6117)
  [`67a9c49`](https://github.com/ardatan/graphql-tools/commit/67a9c4909b7676b69c4b425ab1a6cd5533c799ef)
  Thanks [@ardatan](https://github.com/ardatan)! - Add field as an unavailable field only if it is
  not able to resolve by any other subschema;

  When the following query is sent to the gateway with the following subschemas, the gateway should
  resolve `Category.details` from A Subschema using `Product` resolver instead of trying to resolve
  by using non-existing `Category` resolver from A Subschema.

  Previously, the query planner decides to resolve `Category.details` after resolving `Category`
  from C Subschema. But it will be too late to resolve `details` because `Category` is not
  resolvable in A Subschema.

  So the requests for `Category.details` and the rest of `Category` should be different.

  So for the following query, we expect a full result;

  ```graphql
  query {
    productFromA(id: "1") {
      id
      name
      category {
        id
        name
        details
      }
    }
  }
  ```

  ```graphql
  # A Subschema
  type Query {
    productFromA(id: ID): Product
    # No category resolver is present
  }

  type Product {
    id: ID
    category: Category
  }

  type Category {
    details: CategoryDetails
  }
  ```

  ```graphql
  # B Subschema
  type Query {
    productFromB(id: ID): Product
  }
  type Product {
    id: ID
    name: String
    category: Category
  }
  type Category {
    id: ID
  }
  ```

  ```graphql
  # C Subschema
  type Query {
    categoryFromC(id: ID): Category
  }

  type Category {
    id: ID
    name: String
  }
  ```

- Updated dependencies
  [[`a06dbd2`](https://github.com/ardatan/graphql-tools/commit/a06dbd263ec7bfc6d50aa8faf2e35396a67b4f0b)]:
  - @graphql-tools/merge@9.0.4

## 9.2.3

### Patch Changes

- [#6109](https://github.com/ardatan/graphql-tools/pull/6109)
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Exclude fields with `__typename` while extracting
  missing fields for the type merging

- Updated dependencies
  [[`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)]:
  - @graphql-tools/delegate@10.0.7

## 9.2.2

### Patch Changes

- [#6107](https://github.com/ardatan/graphql-tools/pull/6107)
  [`b281dd6`](https://github.com/ardatan/graphql-tools/commit/b281dd65276dd9df56a41cc2dbff5139281f02f9)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the priority of isolated fields

## 9.2.1

### Patch Changes

- [#6105](https://github.com/ardatan/graphql-tools/pull/6105)
  [`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle fields in unmerged types as both isolated
  and non-isolated fields

- [#6105](https://github.com/ardatan/graphql-tools/pull/6105)
  [`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect `specifiedByURL` in stitched schemas

- Updated dependencies
  [[`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95),
  [`5567347`](https://github.com/ardatan/graphql-tools/commit/5567347217fdfb72e3f8b389ade6d5912dfb5c95)]:
  - @graphql-tools/utils@10.2.0

## 9.2.0

### Minor Changes

- [#6091](https://github.com/ardatan/graphql-tools/pull/6091)
  [`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4)
  Thanks [@User](https://github.com/User), [@User](https://github.com/User)! - New option
  `useNonNullableFieldOnConflict` in `typeMergingOptions` of `stitchSchemas`

  When you have two schemas like below, you will get a warning about the conflicting fields because
  `name` field is defined as non-null in one schema and nullable in the other schema, and
  non-nullable field can exist in the stitched schema because of the order or any other reasons, and
  this might actually cause an unexpected behavior when you fetch `User.name` from the one who has
  it as non-nullable. This option supresses the warning, and takes the field from the schema that
  has it as non-nullable.

  ```graphql
    type Query {

    }

    type User {
      id: ID!
      name: String
      email: String
    }
  ```

  And;

  ```graphql
    type Query {

    }

    type User {
      id: ID!
      name: String!
    }
  ```

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

- Updated dependencies
  [[`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4),
  [`243c353`](https://github.com/ardatan/graphql-tools/commit/243c353412921cf0063f963ee46b9c63d2f33b41)]:
  - @graphql-tools/delegate@10.0.5

## 9.1.2

### Patch Changes

- [`6d26702`](https://github.com/ardatan/graphql-tools/commit/6d267022eaf4b695b3791927912375f1b1d0f3a8)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect interface types as computed field types

## 9.1.1

### Patch Changes

- [`c5df958`](https://github.com/ardatan/graphql-tools/commit/c5df95858c5b5a57a232740e8e4b667ce5d2da2c)
  Thanks [@ardatan](https://github.com/ardatan)! - Prevent infinite loop while visiting over the
  computed field types

## 9.1.0

### Minor Changes

- [#5162](https://github.com/ardatan/graphql-tools/pull/5162)
  [`27b6f49`](https://github.com/ardatan/graphql-tools/commit/27b6f49c67d4b3fca26d90dcaaef37ff61fe9d0a)
  Thanks [@asodeur](https://github.com/asodeur)! - Adding the ability to return non-scalar types
  from computed fields. Computed fields can now return object types (local or stitched), interfaces,
  unions, or enums.

## 9.0.5

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.3)
    (from `^10.0.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.0.1)
    (from `^9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.2)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.13)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@^10.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/10.0.1)
    (from `^10.0.0`, in `dependencies`)
- Updated dependencies
  [[`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703),
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)]:
  - @graphql-tools/batch-delegate@9.0.1
  - @graphql-tools/delegate@10.0.4
  - @graphql-tools/executor@1.2.1
  - @graphql-tools/merge@9.0.3
  - @graphql-tools/schema@10.0.3
  - @graphql-tools/wrap@10.0.2

## 9.0.4

### Patch Changes

- [#5922](https://github.com/ardatan/graphql-tools/pull/5922)
  [`7f606ea`](https://github.com/ardatan/graphql-tools/commit/7f606ea4da035b220319fb702d6a2c9d5e5d35e9)
  Thanks [@ardatan](https://github.com/ardatan)! - Merge directives correctly

## 9.0.3

### Patch Changes

- [`a0a9c5e1`](https://github.com/ardatan/graphql-tools/commit/a0a9c5e1686508c32a45fc7c9bbda89cb046cbcf)
  Thanks [@ardatan](https://github.com/ardatan)! - Isolate the schemas correctly

## 9.0.2

### Patch Changes

- [`cda328c3`](https://github.com/ardatan/graphql-tools/commit/cda328c3e487ea51e13a3b18f0e2e494fd3275ca)
  Thanks [@ardatan](https://github.com/ardatan)! - Support for multiple key entrypoints for an
  object, and avoid sending whole object if possible

## 9.0.1

### Patch Changes

- [#5474](https://github.com/ardatan/graphql-tools/pull/5474)
  [`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)
  Thanks [@ardatan](https://github.com/ardatan)! - Optimizations for federation

- Updated dependencies
  [[`f31be313`](https://github.com/ardatan/graphql-tools/commit/f31be313b2af5a7c5bf893f1ce1dc7d36bf5340c)]:
  - @graphql-tools/delegate@10.0.1

## 9.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`8fba6cc1`](https://github.com/ardatan/graphql-tools/commit/8fba6cc1876e914d587f5b253332aaedbcaa65e6),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955),
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/delegate@10.0.0
  - @graphql-tools/batch-delegate@9.0.0
  - @graphql-tools/executor@1.0.0
  - @graphql-tools/schema@10.0.0
  - @graphql-tools/merge@9.0.0
  - @graphql-tools/utils@10.0.0
  - @graphql-tools/wrap@10.0.0

## 8.7.50

### Patch Changes

- [#5235](https://github.com/ardatan/graphql-tools/pull/5235)
  [`2bbbe1af`](https://github.com/ardatan/graphql-tools/commit/2bbbe1af0bb7d04685bdceab9252a5ded6809c78)
  Thanks [@belgattitude](https://github.com/belgattitude)! - Add missing dependency on
  @graphql-tools/executor.

- Updated dependencies
  [[`33005c48`](https://github.com/ardatan/graphql-tools/commit/33005c48e8aa9d5eae53c720bd39dca655c645f1)]:
  - @graphql-tools/merge@8.4.2

## 8.7.49

### Patch Changes

- [#5220](https://github.com/ardatan/graphql-tools/pull/5220)
  [`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)
  Thanks [@ardatan](https://github.com/ardatan)! - Performance improvements

- Updated dependencies
  [[`8e80b689`](https://github.com/ardatan/graphql-tools/commit/8e80b6893d2342353731610d5da9db633d806083)]:
  - @graphql-tools/batch-delegate@8.4.27
  - @graphql-tools/delegate@9.0.35

## 8.7.48

### Patch Changes

- [`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions for dependencies

- Updated dependencies
  [[`1c95368a`](https://github.com/ardatan/graphql-tools/commit/1c95368aea868be537d956ba5e994cde58dfee41)]:
  - @graphql-tools/batch-delegate@8.4.25
  - @graphql-tools/schema@9.0.18
  - @graphql-tools/merge@8.4.1
  - @graphql-tools/wrap@9.4.2
  - @graphql-tools/delegate@9.0.31

## 8.7.47

### Patch Changes

- Updated dependencies
  [[`c8d5e0df`](https://github.com/ardatan/graphql-tools/commit/c8d5e0dfccdfc40d2a586650b56c124f3e4c5d42)]:
  - @graphql-tools/wrap@9.4.1
  - @graphql-tools/delegate@9.0.30
  - @graphql-tools/batch-delegate@8.4.24

## 8.7.46

### Patch Changes

- Updated dependencies
  [[`68c158d2`](https://github.com/ardatan/graphql-tools/commit/68c158d2b4e0f8bdd94daafd63ea6b3efb29d7eb)]:
  - @graphql-tools/wrap@9.4.0

## 8.7.45

### Patch Changes

- Updated dependencies
  [[`f26392a6`](https://github.com/ardatan/graphql-tools/commit/f26392a66299956da1e66253b181f85332c93db5)]:
  - @graphql-tools/delegate@9.0.29
  - @graphql-tools/batch-delegate@8.4.23
  - @graphql-tools/wrap@9.3.9

## 8.7.44

### Patch Changes

- Updated dependencies
  [[`1913bf91`](https://github.com/ardatan/graphql-tools/commit/1913bf913130f20582152f3cbb1a4bfb49d85a13)]:
  - @graphql-tools/batch-delegate@8.4.22

## 8.7.43

### Patch Changes

- Updated dependencies
  [[`04e3ecb9`](https://github.com/ardatan/graphql-tools/commit/04e3ecb9c377834984ab0a272add29a1709e305d)]:
  - @graphql-tools/merge@8.4.0
  - @graphql-tools/schema@9.0.17
  - @graphql-tools/wrap@9.3.8

## 8.7.42

### Patch Changes

- Updated dependencies
  [[`492220cb`](https://github.com/ardatan/graphql-tools/commit/492220cbdf240e7abde23af0aabcb8cbc6fd3656)]:
  - @graphql-tools/delegate@9.0.28
  - @graphql-tools/batch-delegate@8.4.21
  - @graphql-tools/wrap@9.3.7

## 8.7.41

### Patch Changes

- Updated dependencies
  [[`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9),
  [`30bd4d0c`](https://github.com/ardatan/graphql-tools/commit/30bd4d0c10f59147faba925dc0941c731b0532a9)]:
  - @graphql-tools/batch-delegate@8.4.20
  - @graphql-tools/delegate@9.0.27
  - @graphql-tools/wrap@9.3.6

## 8.7.40

### Patch Changes

- Updated dependencies
  [[`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155),
  [`b09ea282`](https://github.com/ardatan/graphql-tools/commit/b09ea282f0945fb19f354af57aabddcd23b2a155),
  [`85659bca`](https://github.com/ardatan/graphql-tools/commit/85659bca1bdbd6d4a9a6e875acfbf9bb36056ea6),
  [`b5c8f640`](https://github.com/ardatan/graphql-tools/commit/b5c8f6407b74466ed0d2989000458cb59239e9af)]:
  - @graphql-tools/batch-delegate@8.4.19
  - @graphql-tools/delegate@9.0.26
  - @graphql-tools/wrap@9.3.5
  - @graphql-tools/utils@9.2.1
  - @graphql-tools/merge@8.3.18
  - @graphql-tools/schema@9.0.16

## 8.7.39

### Patch Changes

- Updated dependencies
  [[`a94217e9`](https://github.com/ardatan/graphql-tools/commit/a94217e920c5d6237471ab6ad4d96cf230984177),
  [`62d074be`](https://github.com/ardatan/graphql-tools/commit/62d074be48779b1e096e056ca1233822c421dc99)]:
  - @graphql-tools/utils@9.2.0
  - @graphql-tools/batch-delegate@8.4.18
  - @graphql-tools/delegate@9.0.25
  - @graphql-tools/merge@8.3.17
  - @graphql-tools/schema@9.0.15
  - @graphql-tools/wrap@9.3.4

## 8.7.38

### Patch Changes

- Updated dependencies
  [[`772b948a`](https://github.com/ardatan/graphql-tools/commit/772b948ae536ac23520e704b33f450c94252f113)]:
  - @graphql-tools/delegate@9.0.24
  - @graphql-tools/batch-delegate@8.4.17
  - @graphql-tools/wrap@9.3.3

## 8.7.37

### Patch Changes

- Updated dependencies
  [[`8555c5c5`](https://github.com/ardatan/graphql-tools/commit/8555c5c57094e14b6ed1380c6572e0681444496b)]:
  - @graphql-tools/merge@8.3.16
  - @graphql-tools/schema@9.0.14
  - @graphql-tools/batch-delegate@8.4.16
  - @graphql-tools/delegate@9.0.23
  - @graphql-tools/wrap@9.3.2

## 8.7.36

### Patch Changes

- [`fdb3e4c4`](https://github.com/ardatan/graphql-tools/commit/fdb3e4c4bbd004c92b52c55a0733793339822639)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix enum value transformation with
  `stitchSchemas`

- Updated dependencies
  [[`fdb3e4c4`](https://github.com/ardatan/graphql-tools/commit/fdb3e4c4bbd004c92b52c55a0733793339822639)]:
  - @graphql-tools/wrap@9.3.1

## 8.7.35

### Patch Changes

- Updated dependencies
  [[`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`a4d36fcc`](https://github.com/ardatan/graphql-tools/commit/a4d36fccce6113843a55b77c96328727f4c748bc),
  [`499365aa`](https://github.com/ardatan/graphql-tools/commit/499365aa3f33148a47e708351416b6a54c17655a),
  [`e3ec35ed`](https://github.com/ardatan/graphql-tools/commit/e3ec35ed27d4a329739c8da6be06ce74c8f25591)]:
  - @graphql-tools/delegate@9.0.22
  - @graphql-tools/schema@9.0.13
  - @graphql-tools/wrap@9.3.0
  - @graphql-tools/utils@9.1.4
  - @graphql-tools/batch-delegate@8.4.15
  - @graphql-tools/merge@8.3.15

## 8.7.34

### Patch Changes

- Updated dependencies
  [[`13177794`](https://github.com/ardatan/graphql-tools/commit/131777947d111e6a952d9e0e581fd651664101a1)]:
  - @graphql-tools/delegate@9.0.21
  - @graphql-tools/batch-delegate@8.4.14
  - @graphql-tools/wrap@9.2.23

## 8.7.33

### Patch Changes

- Updated dependencies
  [[`55e24643`](https://github.com/ardatan/graphql-tools/commit/55e24643fac7eb25b7e4a6fefb15bd48ee562593)]:
  - @graphql-tools/wrap@9.2.22

## 8.7.32

### Patch Changes

- Updated dependencies
  [[`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a),
  [`eb6cd8b6`](https://github.com/ardatan/graphql-tools/commit/eb6cd8b65dc72434348c259538b233e57a58eb1a)]:
  - @graphql-tools/delegate@9.0.20
  - @graphql-tools/wrap@9.2.21
  - @graphql-tools/batch-delegate@8.4.13

## 8.7.31

### Patch Changes

- Updated dependencies
  [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759),
  [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3
  - @graphql-tools/delegate@9.0.19
  - @graphql-tools/batch-delegate@8.4.12
  - @graphql-tools/merge@8.3.14
  - @graphql-tools/schema@9.0.12
  - @graphql-tools/wrap@9.2.20

## 8.7.30

### Patch Changes

- Updated dependencies
  [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b),
  [`b5e6459f`](https://github.com/ardatan/graphql-tools/commit/b5e6459f87cd8720457ce9bff38f3dfa0cb3c150)]:
  - @graphql-tools/delegate@9.0.18
  - @graphql-tools/utils@9.1.2
  - @graphql-tools/batch-delegate@8.4.11
  - @graphql-tools/wrap@9.2.19
  - @graphql-tools/merge@8.3.13
  - @graphql-tools/schema@9.0.11

## 8.7.29

### Patch Changes

- Updated dependencies
  [[`02126e63`](https://github.com/ardatan/graphql-tools/commit/02126e631b103617e0f07b90e157d5be5678ef84)]:
  - @graphql-tools/wrap@9.2.18

## 8.7.28

### Patch Changes

- Updated dependencies
  [[`7aa610ae`](https://github.com/ardatan/graphql-tools/commit/7aa610ae01d63eebab92b0677650457338e73827)]:
  - @graphql-tools/wrap@9.2.17

## 8.7.27

### Patch Changes

- [#4866](https://github.com/ardatan/graphql-tools/pull/4866)
  [`44fe1ef1`](https://github.com/ardatan/graphql-tools/commit/44fe1ef1ef371bfa71b9b015aedc4ee205b0f19f)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not keep internal enum values while stitching

## 8.7.26

### Patch Changes

- Updated dependencies
  [[`5bd8c0dc`](https://github.com/ardatan/graphql-tools/commit/5bd8c0dc565ec46b3ae2b507ed3f039e96a63ddb)]:
  - @graphql-tools/wrap@9.2.16

## 8.7.25

### Patch Changes

- Updated dependencies
  [[`e3f81ea5`](https://github.com/ardatan/graphql-tools/commit/e3f81ea5bf449dafee45d6f770f88af8354aeffc)]:
  - @graphql-tools/wrap@9.2.15

## 8.7.24

### Patch Changes

- Updated dependencies
  [[`df81034c`](https://github.com/ardatan/graphql-tools/commit/df81034c48b49ed5690f0c8cc61dc8dc47830bf8)]:
  - @graphql-tools/wrap@9.2.14

## 8.7.23

### Patch Changes

- Updated dependencies
  [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1
  - @graphql-tools/batch-delegate@8.4.10
  - @graphql-tools/delegate@9.0.17
  - @graphql-tools/merge@8.3.12
  - @graphql-tools/schema@9.0.10
  - @graphql-tools/wrap@9.2.13

## 8.7.22

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.16
  - @graphql-tools/batch-delegate@8.4.9
  - @graphql-tools/wrap@9.2.12

## 8.7.21

### Patch Changes

- Updated dependencies
  [[`1270b75a`](https://github.com/ardatan/graphql-tools/commit/1270b75a01ffca0d3f301bb809a572e0ee7b1c88),
  [`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/wrap@9.2.11
  - @graphql-tools/utils@9.1.0
  - @graphql-tools/batch-delegate@8.4.8
  - @graphql-tools/delegate@9.0.15
  - @graphql-tools/merge@8.3.11
  - @graphql-tools/schema@9.0.9

## 8.7.20

### Patch Changes

- Updated dependencies
  [[`a58cd6d3`](https://github.com/ardatan/graphql-tools/commit/a58cd6d38d7856edbf9404a3694d592cd1c383d1)]:
  - @graphql-tools/wrap@9.2.10

## 8.7.19

### Patch Changes

- Updated dependencies
  [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1
  - @graphql-tools/batch-delegate@8.4.7
  - @graphql-tools/delegate@9.0.14
  - @graphql-tools/merge@8.3.10
  - @graphql-tools/schema@9.0.8
  - @graphql-tools/wrap@9.2.9

## 8.7.18

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.13
  - @graphql-tools/batch-delegate@8.4.6
  - @graphql-tools/wrap@9.2.8

## 8.7.17

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/delegate@9.0.12
  - @graphql-tools/batch-delegate@8.4.5
  - @graphql-tools/wrap@9.2.7

## 8.7.16

### Patch Changes

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796)
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)
  Thanks [@saihaj](https://github.com/saihaj)! - update `collectFields` to support collecting
  deffered values

- Updated dependencies
  [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931),
  [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/utils@9.0.0
  - @graphql-tools/delegate@9.0.11
  - @graphql-tools/batch-delegate@8.4.4
  - @graphql-tools/merge@8.3.9
  - @graphql-tools/schema@9.0.7
  - @graphql-tools/wrap@9.2.6

## 8.7.15

### Patch Changes

- Updated dependencies
  [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175),
  [`c1d01f3d`](https://github.com/ardatan/graphql-tools/commit/c1d01f3dd19b35dae4d4838af7f27490655549c6)]:
  - @graphql-tools/utils@8.13.1
  - @graphql-tools/wrap@9.2.5
  - @graphql-tools/batch-delegate@8.4.3
  - @graphql-tools/delegate@9.0.10
  - @graphql-tools/merge@8.3.8
  - @graphql-tools/schema@9.0.6

## 8.7.14

### Patch Changes

- Updated dependencies
  [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f),
  [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/delegate@9.0.9
  - @graphql-tools/utils@8.13.0
  - @graphql-tools/batch-delegate@8.4.2
  - @graphql-tools/wrap@9.2.4
  - @graphql-tools/merge@8.3.7
  - @graphql-tools/schema@9.0.5

## 8.7.13

### Patch Changes

- Updated dependencies
  [[`0402894d`](https://github.com/ardatan/graphql-tools/commit/0402894d0b2747ae5d98d28df9b39d6a06cc5f2a)]:
  - @graphql-tools/delegate@9.0.8
  - @graphql-tools/batch-delegate@8.4.1
  - @graphql-tools/wrap@9.2.3

## 8.7.12

### Patch Changes

- Updated dependencies
  [[`614a5622`](https://github.com/ardatan/graphql-tools/commit/614a56224aed6224be708a601c816647e679a4fe),
  [`00c4a1a4`](https://github.com/ardatan/graphql-tools/commit/00c4a1a44e14b9950f44d56f44967ab7a0121706)]:
  - @graphql-tools/batch-delegate@8.4.0
  - @graphql-tools/delegate@9.0.7
  - @graphql-tools/wrap@9.2.2

## 8.7.11

### Patch Changes

- Updated dependencies
  [[`c21a895a`](https://github.com/ardatan/graphql-tools/commit/c21a895a19721f73037d43e664aa8346f59356e8)]:
  - @graphql-tools/wrap@9.2.1

## 8.7.10

### Patch Changes

- Updated dependencies
  [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c),
  [`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0
  - @graphql-tools/wrap@9.2.0
  - @graphql-tools/batch-delegate@8.3.9
  - @graphql-tools/delegate@9.0.6
  - @graphql-tools/merge@8.3.6
  - @graphql-tools/schema@9.0.4

## 8.7.9

### Patch Changes

- Updated dependencies
  [[`dd8886d1`](https://github.com/ardatan/graphql-tools/commit/dd8886d1534fdf73b7cfb6d54b13a3db5812b38b)]:
  - @graphql-tools/wrap@9.1.0

## 8.7.8

### Patch Changes

- Updated dependencies
  [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f),
  [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0
  - @graphql-tools/batch-delegate@8.3.8
  - @graphql-tools/delegate@9.0.5
  - @graphql-tools/merge@8.3.5
  - @graphql-tools/schema@9.0.3
  - @graphql-tools/wrap@9.0.6

## 8.7.7

### Patch Changes

- Updated dependencies
  [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97),
  [`4e4fac0a`](https://github.com/ardatan/graphql-tools/commit/4e4fac0a8a46b5498a30a81932ef28d1f788efaa)]:
  - @graphql-tools/utils@8.10.1
  - @graphql-tools/wrap@9.0.5
  - @graphql-tools/batch-delegate@8.3.7
  - @graphql-tools/delegate@9.0.4
  - @graphql-tools/merge@8.3.4
  - @graphql-tools/schema@9.0.2

## 8.7.6

### Patch Changes

- [#4640](https://github.com/ardatan/graphql-tools/pull/4640)
  [`27bdc237`](https://github.com/ardatan/graphql-tools/commit/27bdc23713a5176485ac940fc5431256b4f2de8d)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/batch-delegate@8.3.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/batch-delegate/v/8.3.5)
    (was `8.3.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/delegate@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.3)
    (was `9.0.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/wrap@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/9.0.3)
    (was `9.0.2`, in `dependencies`)

- Updated dependencies
  [[`27bdc237`](https://github.com/ardatan/graphql-tools/commit/27bdc23713a5176485ac940fc5431256b4f2de8d),
  [`27bdc237`](https://github.com/ardatan/graphql-tools/commit/27bdc23713a5176485ac940fc5431256b4f2de8d)]:
  - @graphql-tools/batch-delegate@8.3.6
  - @graphql-tools/wrap@9.0.4

## 8.7.5

### Patch Changes

- [`0555a972`](https://github.com/ardatan/graphql-tools/commit/0555a972f010d2b3ca93b9164b26474a78d0b20b)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump versions

- Updated dependencies
  [[`0555a972`](https://github.com/ardatan/graphql-tools/commit/0555a972f010d2b3ca93b9164b26474a78d0b20b)]:
  - @graphql-tools/delegate@9.0.3
  - @graphql-tools/wrap@9.0.3
  - @graphql-tools/batch-delegate@8.3.5

## 8.7.4

### Patch Changes

- [#4648](https://github.com/ardatan/graphql-tools/pull/4648)
  [`29ee7542`](https://github.com/ardatan/graphql-tools/commit/29ee7542649e9c938bdb9c751bd3a2f56d17cb55)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not call `Transform.transformSchema` more than
  once

- Updated dependencies
  [[`29ee7542`](https://github.com/ardatan/graphql-tools/commit/29ee7542649e9c938bdb9c751bd3a2f56d17cb55)]:
  - @graphql-tools/delegate@9.0.2
  - @graphql-tools/wrap@9.0.2
  - @graphql-tools/batch-delegate@8.3.4

## 8.7.3

### Patch Changes

- Updated dependencies
  [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0
  - @graphql-tools/merge@8.3.3
  - @graphql-tools/schema@9.0.1
  - @graphql-tools/batch-delegate@8.3.3
  - @graphql-tools/delegate@9.0.1
  - @graphql-tools/wrap@9.0.1

## 8.7.2

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`8cc8721f`](https://github.com/ardatan/graphql-tools/commit/8cc8721fbbff3c978fd67d162df833d6973c1860),
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67),
  [`d8dc67aa`](https://github.com/ardatan/graphql-tools/commit/d8dc67aa6cb05bf10f5f16e90690e5ccc87b3426)]:
  - @graphql-tools/schema@9.0.0
  - @graphql-tools/batch-delegate@8.3.2
  - @graphql-tools/delegate@9.0.0
  - @graphql-tools/merge@8.3.2
  - @graphql-tools/utils@8.9.1
  - @graphql-tools/wrap@9.0.0

## 8.7.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/batch-delegate@8.3.1
  - @graphql-tools/delegate@8.8.1
  - @graphql-tools/merge@8.3.1
  - @graphql-tools/schema@8.5.1
  - @graphql-tools/wrap@8.5.1

## 8.7.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/batch-delegate@8.3.0
  - @graphql-tools/delegate@8.8.0
  - @graphql-tools/merge@8.3.0
  - @graphql-tools/schema@8.5.0
  - @graphql-tools/wrap@8.5.0

## 8.6.14

### Patch Changes

- Updated dependencies [6df204de]
- Updated dependencies [4914970b]
  - @graphql-tools/delegate@8.7.12
  - @graphql-tools/schema@8.4.0
  - @graphql-tools/utils@8.7.0
  - @graphql-tools/batch-delegate@8.2.21
  - @graphql-tools/wrap@8.4.21
  - @graphql-tools/merge@8.2.15

## 8.6.13

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/batch-delegate@8.2.20
  - @graphql-tools/delegate@8.7.11
  - @graphql-tools/merge@8.2.14
  - @graphql-tools/schema@8.3.14
  - @graphql-tools/utils@8.6.13
  - @graphql-tools/wrap@8.4.20

## 8.6.12

### Patch Changes

- Updated dependencies [7c3b2797]
- Updated dependencies [da7ad43b]
  - @graphql-tools/wrap@8.4.19
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/batch-delegate@8.2.19
  - @graphql-tools/delegate@8.7.10
  - @graphql-tools/merge@8.2.13
  - @graphql-tools/schema@8.3.13

## 8.6.11

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/batch-delegate@8.2.18
  - @graphql-tools/delegate@8.7.9
  - @graphql-tools/merge@8.2.12
  - @graphql-tools/schema@8.3.12
  - @graphql-tools/wrap@8.4.18

## 8.6.10

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/batch-delegate@8.2.17
  - @graphql-tools/delegate@8.7.8
  - @graphql-tools/merge@8.2.11
  - @graphql-tools/schema@8.3.11
  - @graphql-tools/wrap@8.4.17

## 8.6.9

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/batch-delegate@8.2.16
  - @graphql-tools/delegate@8.7.7
  - @graphql-tools/merge@8.2.10
  - @graphql-tools/schema@8.3.10
  - @graphql-tools/wrap@8.4.16

## 8.6.8

### Patch Changes

- Updated dependencies [26e4b464]
  - @graphql-tools/delegate@8.7.6
  - @graphql-tools/batch-delegate@8.2.15
  - @graphql-tools/wrap@8.4.15

## 8.6.7

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/batch-delegate@8.2.14
  - @graphql-tools/delegate@8.7.5
  - @graphql-tools/merge@8.2.9
  - @graphql-tools/schema@8.3.9
  - @graphql-tools/wrap@8.4.14

## 8.6.6

### Patch Changes

- 0bbb1769: Refine generic typings using `extends X` when appropriate

  Typescript 4.7 has stricter requirements around generics which is explained well in the related
  PR: https://github.com/microsoft/TypeScript/pull/48366

  These changes resolve the errors that these packages will face when attempting to upgrade to TS
  4.7 (still in beta at the time of writing this). Landing these changes now will allow other TS
  libraries which depend on these packages to experiment with TS 4.7 in the meantime.

- Updated dependencies [0bbb1769]
  - @graphql-tools/delegate@8.7.4
  - @graphql-tools/utils@8.6.7
  - @graphql-tools/wrap@8.4.13
  - @graphql-tools/batch-delegate@8.2.13
  - @graphql-tools/merge@8.2.8
  - @graphql-tools/schema@8.3.8

## 8.6.5

### Patch Changes

- Updated dependencies [fe9402af]
  - @graphql-tools/batch-delegate@8.2.12
  - @graphql-tools/delegate@8.7.3
  - @graphql-tools/wrap@8.4.12

## 8.6.4

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/batch-delegate@8.2.11
  - @graphql-tools/delegate@8.7.2
  - @graphql-tools/merge@8.2.7
  - @graphql-tools/schema@8.3.7
  - @graphql-tools/wrap@8.4.11

## 8.6.3

### Patch Changes

- Updated dependencies [722abad7]
  - @graphql-tools/schema@8.3.6
  - @graphql-tools/batch-delegate@8.2.10
  - @graphql-tools/delegate@8.7.1
  - @graphql-tools/wrap@8.4.10

## 8.6.2

### Patch Changes

- Updated dependencies [d8fd6b94]
  - @graphql-tools/delegate@8.7.0
  - @graphql-tools/batch-delegate@8.2.9
  - @graphql-tools/wrap@8.4.9

## 8.6.1

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/batch-delegate@8.2.8
  - @graphql-tools/delegate@8.6.1
  - @graphql-tools/merge@8.2.6
  - @graphql-tools/schema@8.3.5
  - @graphql-tools/wrap@8.4.8

## 8.6.0

### Minor Changes

- c40e801f: feat: forward gateway operation's name to subschema executors

### Patch Changes

- Updated dependencies [c40e801f]
- Updated dependencies [d36d530b]
  - @graphql-tools/delegate@8.6.0
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/batch-delegate@8.2.7
  - @graphql-tools/wrap@8.4.7
  - @graphql-tools/merge@8.2.5
  - @graphql-tools/schema@8.3.4

## 8.5.2

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/batch-delegate@8.2.6
  - @graphql-tools/delegate@8.5.4
  - @graphql-tools/merge@8.2.4
  - @graphql-tools/schema@8.3.3
  - @graphql-tools/wrap@8.4.6

## 8.5.1

### Patch Changes

- 3da3d66c: fix - align versions
- Updated dependencies [3da3d66c]
  - @graphql-tools/batch-delegate@8.2.5
  - @graphql-tools/wrap@8.4.5
  - @graphql-tools/utils@8.6.3

## 8.5.0

### Minor Changes

- 70081f8f: enhance(stitch): support promises in key functions

### Patch Changes

- Updated dependencies [70081f8f]
- Updated dependencies [70081f8f]
  - @graphql-tools/delegate@8.5.3

## 8.4.4

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/batch-delegate@8.2.4
  - @graphql-tools/delegate@8.5.1
  - @graphql-tools/merge@8.2.3
  - @graphql-tools/schema@8.3.2
  - @graphql-tools/wrap@8.4.2
  - @graphql-tools/utils@8.6.2

## 8.4.3

### Patch Changes

- Updated dependencies [51315610]
  - @graphql-tools/batch-delegate@8.2.3
  - @graphql-tools/delegate@8.4.3
  - @graphql-tools/utils@8.5.4

## 8.4.2

### Patch Changes

- Updated dependencies [5482c99a]
  - @graphql-tools/batch-delegate@8.2.2

## 8.4.1

### Patch Changes

- 981eef80: enhance: remove isPromise and cleanup file-upload handling
- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [981eef80]
- Updated dependencies [4bfb3428]
  - @graphql-tools/wrap@8.3.1
  - @graphql-tools/batch-delegate@8.2.1
  - @graphql-tools/delegate@8.4.1
  - @graphql-tools/merge@8.2.1
  - @graphql-tools/schema@8.3.1
  - @graphql-tools/utils@8.5.1

## 8.4.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/batch-delegate@8.2.0
  - @graphql-tools/delegate@8.3.0
  - @graphql-tools/merge@8.2.0
  - @graphql-tools/schema@8.3.0
  - @graphql-tools/utils@8.4.0
  - @graphql-tools/wrap@8.2.0

## 8.3.1

### Patch Changes

- d4918a78: fix(commentDescriptions): handle descriptions and comments correctly during merge
- Updated dependencies [d4918a78]
  - @graphql-tools/merge@8.1.1
  - @graphql-tools/utils@8.2.2

## 8.3.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support
- c5b0719c: enhance(utils): move memoize functions to utils
- c5b0719c: enhance(utils): copy collectFields from graphql-js@16 for backwards compat

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/delegate@8.2.0
  - @graphql-tools/utils@8.2.0
  - @graphql-tools/batch-delegate@8.1.0
  - @graphql-tools/merge@8.1.0
  - @graphql-tools/schema@8.2.0
  - @graphql-tools/wrap@8.1.0

## 8.2.1

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- Updated dependencies [c8c13ed1]
  - @graphql-tools/batch-delegate@8.0.12
  - @graphql-tools/delegate@8.1.1
  - @graphql-tools/merge@8.0.3
  - @graphql-tools/utils@8.1.2

## 8.2.0

### Minor Changes

- 631b11bd: refactor(delegationPlanner): introduce static version of our piecemeal planner

  ...which, although undocumented, can be accessed within the StitchingInfo object saved in a
  stitched schema's extensions.

  Also improves memoization technique slightly across the board.

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/delegate@8.1.0
  - @graphql-tools/batch-delegate@8.0.11
  - @graphql-tools/merge@8.0.2
  - @graphql-tools/schema@8.1.2
  - @graphql-tools/wrap@8.0.13

## 8.1.2

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/batch-delegate@8.0.10
  - @graphql-tools/delegate@8.0.10
  - @graphql-tools/merge@8.0.1
  - @graphql-tools/schema@8.1.1
  - @graphql-tools/wrap@8.0.12

## 8.1.1

### Patch Changes

- 9a13357c: Fix nested type merges with repeated children ignore all but first occurrence
- Updated dependencies [9a13357c]
  - @graphql-tools/delegate@8.0.9
  - @graphql-tools/batch-delegate@8.0.9
  - @graphql-tools/wrap@8.0.11

## 8.1.0

### Minor Changes

- 67691b78: - `schemaExtensions` option has been added to `mergeSchemas`, `makeExecutableSchema` and
  `stitchSchemas` configurations

  Breaking Changes;

  - Move `mergeSchemas` and `MergeSchemasConfig` from `@graphql-tools/merge` to
    `@graphql-tools/schema` package to prevent circular dependency between them.
  - `mergeSchemasAsync` has been removed.
  - Move `NamedDefinitionNode`, `resetComments`, `collectComment`, `pushComment` and `printComment`
    from `@graphql-tools/merge` to `@graphql-tools/utils`.

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [a5fb77a4]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/merge@8.0.0
  - @graphql-tools/schema@8.1.0
  - @graphql-tools/batch-delegate@8.0.8
  - @graphql-tools/delegate@8.0.8
  - @graphql-tools/wrap@8.0.10

## 8.0.8

### Patch Changes

- Updated dependencies [d47dcf42]
  - @graphql-tools/delegate@8.0.7
  - @graphql-tools/batch-delegate@8.0.7
  - @graphql-tools/wrap@8.0.7

## 8.0.7

### Patch Changes

- Updated dependencies [ded29f3d]
  - @graphql-tools/delegate@8.0.6
  - @graphql-tools/batch-delegate@8.0.6
  - @graphql-tools/wrap@8.0.6

## 8.0.6

### Patch Changes

- Updated dependencies [7fdef335]
  - @graphql-tools/delegate@8.0.5
  - @graphql-tools/batch-delegate@8.0.5
  - @graphql-tools/wrap@8.0.5

## 8.0.5

### Patch Changes

- Updated dependencies [4992b472]
  - @graphql-tools/merge@7.0.0
  - @graphql-tools/schema@8.0.3

## 8.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/batch-delegate@8.0.4
  - @graphql-tools/delegate@8.0.4
  - @graphql-tools/merge@6.2.17
  - @graphql-tools/schema@8.0.2
  - @graphql-tools/wrap@8.0.4

## 8.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/batch-delegate@8.0.3
  - @graphql-tools/delegate@8.0.3
  - @graphql-tools/merge@6.2.16
  - @graphql-tools/schema@8.0.1
  - @graphql-tools/wrap@8.0.3

## 8.0.2

### Patch Changes

- Updated dependencies [d93945fa]
  - @graphql-tools/delegate@8.0.2
  - @graphql-tools/batch-delegate@8.0.2
  - @graphql-tools/wrap@8.0.2

## 8.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import
- Updated dependencies [c36defbe]
  - @graphql-tools/delegate@8.0.1
  - @graphql-tools/batch-delegate@8.0.1
  - @graphql-tools/wrap@8.0.1

## 8.0.0

### Major Changes

- 7d3e3006: BREAKING CHANGE
  - Legacy Schema Directives and Directive Resolvers have been removed
  - - You can check the new method for both;
  - - - https://www.graphql-tools.com/docs/schema-directives
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

- 74581cf3: fix(getDirectives): preserve order around repeatable directives

  BREAKING CHANGE: getDirectives now always return an array of individual DirectiveAnnotation
  objects consisting of `name` and `args` properties.

  New useful function `getDirective` returns an array of objects representing any args for each use
  of a single directive (returning the empty object `{}` when a directive is used without
  arguments).

  Note: The `getDirective` function returns an array even when the specified directive is
  non-repeatable. This is because one use of this function is to throw an error if more than one
  directive annotation is used for a non repeatable directive!

  When specifying directives in extensions, one can use either the old or new format.

- c0ca3190: BREAKING CHANGE
  - Remove Subscriber and use only Executor
  - - Now `Executor` can receive `AsyncIterable` and subscriptions will also be handled by
      `Executor`. This is a future-proof change for defer, stream and live queries

### Minor Changes

- 1b0ce2ae: @ardatanfeat(stitch): add helpers for Relay

### Patch Changes

- 91155ab6: Fixed issue with stitchSchemas function returning info object with left.subschema and
  right.subschema referencing the same object
- Updated dependencies [af9a78de]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [d53e3be5]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [7d3e3006]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [aa43054d]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [a31f9593]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/delegate@8.0.0
  - @graphql-tools/wrap@8.0.0
  - @graphql-tools/schema@8.0.0
  - @graphql-tools/batch-delegate@8.0.0
  - @graphql-tools/merge@6.2.15

## 7.5.3

### Patch Changes

- b48f944c: chore(stitch) export typescript package types + cleanup (#2918)

## 7.5.2

### Patch Changes

- 61da3e82: use value-or-promise to streamline working with sync values or async promises
- Updated dependencies [61da3e82]
  - @graphql-tools/delegate@7.1.4
  - @graphql-tools/schema@7.1.4
  - @graphql-tools/wrap@7.0.6

## 7.5.1

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

- Updated dependencies [6aed1714]
  - @graphql-tools/delegate@7.1.2

## 7.5.0

### Minor Changes

- 58fd4b28: feat(types): add TContext to stitchSchemas and executor

### Patch Changes

- Updated dependencies [58fd4b28]
- Updated dependencies [43da6b59]
  - @graphql-tools/delegate@7.1.0
  - @graphql-tools/utils@7.7.0
  - @graphql-tools/merge@6.2.11

## 7.4.0

### Minor Changes

- 0194118f: Introduces a suite of stitched schema validations that enforce the integrity of merged
  schemas. This includes validations for:

  - Strict and safe null consistency (the later of which allows safe transitions in nullability).
  - Named type consistency with the option to whitelist proxiable scalar mappings.
  - Argument and input field name consistency.
  - Enum value consistency when used as an input value.

  Validations may be adjusted by setting `validationLevel` to `off|warn|error` globally or scoped
  for specific types and fields. In this initial v7 release, all validations are introduced at the
  `warn` threshold for backwards compatibility. Most of these validations will become automatic
  errors in v8. To enable validation errors now, set `validationLevel: 'error'`. Full configuration
  options look like this:

  ```js
  const gatewaySchema = stitchSchemas({
    subschemas: [...],
    typeMergingOptions: {
      validationSettings: {
        validationLevel: 'error',
        strictNullComparison: false, // << gateway "String" may proxy subschema "String!"
        proxiableScalars: {
          ID: ['String'], // << gateway "ID" may proxy subschema "String"
        }
      },
      validationScopes: {
        // scope to specific element paths
        'User.id': {
          validationLevel: 'warn',
          strictNullComparison: true,
        },
      }
    },
  });
  ```

### Patch Changes

- Updated dependencies [0194118f]
  - @graphql-tools/merge@6.2.10

## 7.3.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [24926654]
  - @graphql-tools/delegate@7.0.10

## 7.2.1

### Patch Changes

- 3cf9104c: fix(stitch) canonical via transformed subschema

## 7.2.0

### Minor Changes

- d9b82a2e: enhance(stitch) canonical merged type and field definitions. Use the @canonical
  directive to promote preferred type and field descriptions into the combined gateway schema.

### Patch Changes

- d9b82a2e: fix(merge/stitch) consistent enum value merge
- Updated dependencies [d9b82a2e]
- Updated dependencies [d9b82a2e]
- Updated dependencies [d9b82a2e]
  - @graphql-tools/merge@6.2.7
  - @graphql-tools/delegate@7.0.9

## 7.1.9

### Patch Changes

- 6a966bee: fix(stitch): add \_\_typename for mutations

  fix related to #2349

## 7.1.8

### Patch Changes

- 6e50d9fc: enhance(stitching-directives): use keyField

  When using simple keys, i.e. when using the keyField argument to `@merge`, the keyField can be
  added implicitly to the types's key. In most cases, therefore, `@key` should not be required at
  all.

- Updated dependencies [6e50d9fc]
  - @graphql-tools/utils@7.2.4

## 7.1.7

### Patch Changes

- 06a6acbe: fix(stitch): computed fields should work with merge resolvers that return abstract types

  see: https://github.com/ardatan/graphql-tools/pull/2432#issuecomment-753729191 and:
  https://github.com/gmac/schema-stitching-handbook/pull/17

## 7.1.6

### Patch Changes

- c84d2f8f: fix(stitch): always use defaultMergedResolver by default on gateway

## 7.1.5

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

- Updated dependencies [cd5da458]
- Updated dependencies [cd5da458]
- Updated dependencies [cd5da458]
  - @graphql-tools/delegate@7.0.8
  - @graphql-tools/utils@7.1.6

## 7.1.4

### Patch Changes

- 21da6904: fix release
- Updated dependencies [21da6904]
  - @graphql-tools/wrap@7.0.3
  - @graphql-tools/schema@7.1.2
  - @graphql-tools/utils@7.1.2

## 7.1.3

### Patch Changes

- b48a91b1: add ability to specify merge config within subschemas using directives
- Updated dependencies [b48a91b1]
  - @graphql-tools/schema@7.1.1
  - @graphql-tools/utils@7.1.1

## 7.1.2

### Patch Changes

- 8db8f8dd: fix(typeMerging): support transformed type names when merging types

## 7.1.1

### Patch Changes

- 878c36b6: enhance(stitch): use mergeScalar from merge
- 9c6a4409: enhance(stitch): avoid multiple iterations
- Updated dependencies [878c36b6]
- Updated dependencies [d40c0a84]
  - @graphql-tools/merge@6.2.6
  - @graphql-tools/delegate@7.0.6

## 7.1.0

### Minor Changes

- 4f5a4efe: enhance(schema): add some options to improve schema creation performance

### Patch Changes

- Updated dependencies [65ed780a]
- Updated dependencies [4f5a4efe]
- Updated dependencies [b79e3a6b]
  - @graphql-tools/schema@7.1.0
  - @graphql-tools/utils@7.1.0

## 7.0.4

### Patch Changes

- e50f80a3: enhance(stitch): custom merge resolvers
- Updated dependencies [e50f80a3]
  - @graphql-tools/delegate@7.0.5

## 7.0.3

### Patch Changes

- 718eda30: fix(stitch): fix mergeExternalObject regressions

  v7 introduced a regression in the merging of ExternalObjects that causes type merging to fail when
  undergoing multiple rounds of merging.

- Updated dependencies [718eda30]
  - @graphql-tools/delegate@7.0.2

## 7.0.2

### Patch Changes

- fcbc497b: fix(stitch): support type merging with abstract types (#2137)

## 7.0.1

### Patch Changes

- Updated dependencies [a9254491]
  - @graphql-tools/batch-delegate@7.0.0

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
  - @graphql-tools/delegate@7.0.0
  - @graphql-tools/schema@7.0.0
  - @graphql-tools/utils@7.0.0
  - @graphql-tools/wrap@7.0.0
  - @graphql-tools/merge@6.2.5
  - @graphql-tools/batch-delegate@6.2.5

## 6.2.4

### Patch Changes

- 32c3c4f8: enhance(HoistFields): allow arguments
- 32c3c4f8: enhance(stitching): improve error message for unknown types
- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/wrap@6.2.4
  - @graphql-tools/merge@6.2.4
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/delegate@6.2.4
  - @graphql-tools/batch-delegate@6.2.4
  - @graphql-tools/schema@6.2.4
