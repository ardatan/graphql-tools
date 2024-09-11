# @graphql-tools/federation

## 2.2.10

### Patch Changes

- [`a600be6`](https://github.com/ardatan/graphql-tools/commit/a600be627a6d619ef4c95a445a5c7801d166787b)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `onSubgraphAST`

## 2.2.9

### Patch Changes

- [#6469](https://github.com/ardatan/graphql-tools/pull/6469)
  [`0e87805`](https://github.com/ardatan/graphql-tools/commit/0e8780572fb1a852c8f4d7c8a59b064ae92bdd6b)
  Thanks [@User!](https://github.com/User!)! - Handle merged selection sets in the computed fields;

  When a selection set for a computed field needs to be merged, resolve that required selection set
  fully then resolve the computed field. In the following case, the selection set for the `author`
  field in the `Post` type is merged with the selection set for the `authorId` field in the
  `Comment` type.

  ```graphql
  type Query {
    feed: [Post!]!
  }

  type Post {
    id: ID! @computed(selectionSet: "{ comments { authorId } }")
  }

  type Comment {
    id: ID!
    authorId: ID!
  }

  type User {
    id: ID!
    name: String!
  }
  ```

  ```graphql
  type Post {
    id: ID!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
  }
  ```

- Updated dependencies
  [[`0e87805`](https://github.com/ardatan/graphql-tools/commit/0e8780572fb1a852c8f4d7c8a59b064ae92bdd6b)]:
  - @graphql-tools/delegate@10.0.20

## 2.2.8

### Patch Changes

- [#6441](https://github.com/ardatan/graphql-tools/pull/6441)
  [`52a69ed`](https://github.com/ardatan/graphql-tools/commit/52a69edb8979fd081d1caea90684f5d61dc9f6ec)
  Thanks [@ardatan](https://github.com/ardatan)! - Filter errors as null in the projected key

  If the key field has `Error`, do not send them to the subgraphs as objects but `null`.

## 2.2.7

### Patch Changes

- [#6437](https://github.com/ardatan/graphql-tools/pull/6437)
  [`3188051`](https://github.com/ardatan/graphql-tools/commit/3188051ae530772210e9f3a2c9615932ef13f497)
  Thanks [@User](https://github.com/User), [@()](<https://github.com/()>),
  [@{](https://github.com/{), [@{](https://github.com/{), [@{](https://github.com/{),
  [@{](https://github.com/{), [@{](https://github.com/{)! - Fix the bug happens when a merged field
  is a computed field requires another computed field requires a field from the initial subschema.

  In the following test case, `totalOrdersPrices` needs `userOrders` which needs `lastName` from
  initial `Query.user`. So the bug was skipping the dependencies of `userOrders` because it assumed
  `lastName` already there by mistake.

  ```ts
      const schema1 = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            firstName: String!
            lastName: String!
            address: String
          }

          type Query {

          }
        `,
        resolvers: {
          Query: {
   => {
              return {
                id: 1,
                firstName: 'Jake',
                lastName: 'Dawkins',
                address: 'everywhere',
              };
            },
          },
        },
      });
      const schema2 = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type UserOrder {
            id: ID!
          }

          type User {
            id: ID!
            totalOrdersPrices: Int
            aggregatedOrdersByStatus: Int
          }

          type Query {
            userWithOrderDetails(userId: ID!, userOrderIds: [ID]): User
          }
        `,
        resolvers: {
          Query: {
            userWithOrderDetails: (_root, { userId, userOrderIds }) => {
              return {
                id: userId,
                userOrders: userOrderIds?.map((userOrderId: string) => ({ id: userOrderId })),
              };
            },
          },

            totalOrdersPrices(user) {
              if (user.userOrders instanceof Error) {
                return user.userOrders;
              }
              if (!user.userOrders) {
                throw new Error('UserOrders is required');
              }
              return 0;
            },
            aggregatedOrdersByStatus(user) {
              if (user.userOrders instanceof Error) {
                return user.userOrders;
              }
              if (!user.userOrders) {
                throw new Error('UserOrders is required');
              }
              return 1;
            },
          },
        },
      });
      const schema3 = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            userOrders: [UserOrder!]
          }

          type UserOrder {
            id: ID!
          }

          type Query {
            userWithOrders(id: ID!, lastName: String): User
          }
        `,
        resolvers: {
          Query: {
            userWithOrders: (_root, { id, lastName }) => {
              return {
                id,
                lastName,
              };
            },
          },

            userOrders(user) {
              if (!user.lastName) {
                throw new Error('LastName is required');
              }
              return [
                {
                  id: `${user.lastName}1`,
                },
              ];
            },
          },
        },
      });
      const stitchedSchema = stitchSchemas({
        subschemas: [
          {
            schema: schema1,
          },
          {
            schema: schema2,
            merge: {

                selectionSet: '{ id }',
                fieldName: 'userWithOrderDetails',
                args: ({ id, userOrders }: { id: string; userOrders: any[] }) => ({
                  userId: id,
                  userOrderIds: userOrders?.map?.(({ id }: { id: string }) => id),
                }),
                fields: {
                  totalOrdersPrices: {
                    selectionSet: '{ userOrders { id } }',
                    computed: true,
                  },
                  aggregatedOrdersByStatus: {
                    selectionSet: '{ userOrders { id } }',
                    computed: true,
                  },
                },
              },
            },
          },
          {
            schema: schema3,
            merge: {

                selectionSet: '{ id }',
                fieldName: 'userWithOrders',
                args: ({ id, lastName }: { id: string; lastName: string }) => ({
                  id,
                  lastName,
                }),
                fields: {
                  userOrders: {
                    selectionSet: '{ lastName }',
                    computed: true,
                  },
                },
              },
            },
          },
        ],
      });
      const res = await normalizedExecutor({
        schema: stitchedSchema,
        document: parse(/* GraphQL */ `
          query User {
            user {
              aggregatedOrdersByStatus
              totalOrdersPrices
            }
          }
        `),
      });
      expect(res).toEqual({
        data: {

            aggregatedOrdersByStatus: 1,
            totalOrdersPrices: 0,
          },
        },
      });
  ```

- Updated dependencies
  [[`3188051`](https://github.com/ardatan/graphql-tools/commit/3188051ae530772210e9f3a2c9615932ef13f497)]:
  - @graphql-tools/delegate@10.0.19

## 2.2.6

### Patch Changes

- [`b8bf584`](https://github.com/ardatan/graphql-tools/commit/b8bf584fde87d3064c204d8ac2f9da5b869249c0)
  Thanks [@ardatan](https://github.com/ardatan)! - Introduce \`getDirectiveExtensions\` and refactor
  directive handling in the extensions

- Updated dependencies
  [[`b8bf584`](https://github.com/ardatan/graphql-tools/commit/b8bf584fde87d3064c204d8ac2f9da5b869249c0)]:
  - @graphql-tools/utils@10.4.0
  - @graphql-tools/schema@10.0.5
  - @graphql-tools/merge@9.0.5

## 2.2.5

### Patch Changes

- [`dbb0516`](https://github.com/ardatan/graphql-tools/commit/dbb05162731b7a2baf08f4756d4a4de3dce0a951)
  Thanks [@ardatan](https://github.com/ardatan)! - If there are repeated computed fields like below,
  project the data for the computed fields for each `fields` and merge them correctly. And if they
  are array as in `userOrders`, merge them by respecting the order (the second one can have `price`
  maybe).

  ```graphql
  type UserOrder @key(fields: "id") {
    id: ID!
    status: String!
    price: Int!
  }

  type User @key(fields: "id") {
    id: ID!
    userOrders: [UserOrder!] @external
    totalOrdersPrices: Int @requires(fields: "userOrders { id }")
    aggregatedOrdersByStatus: Int @requires(fields: "userOrders { id }")
  }
  ```

## 2.2.4

### Patch Changes

- [#6403](https://github.com/ardatan/graphql-tools/pull/6403)
  [`3803897`](https://github.com/ardatan/graphql-tools/commit/3803897cef27b15bad1718819c5d75030afbe781)
  Thanks [@ardatan](https://github.com/ardatan)! - Cleanup extra fields, empty inline fragments and
  duplicate \_\_typename fields

- Updated dependencies
  [[`3803897`](https://github.com/ardatan/graphql-tools/commit/3803897cef27b15bad1718819c5d75030afbe781)]:
  - @graphql-tools/delegate@10.0.17

## 2.2.3

### Patch Changes

- [`0d203ab`](https://github.com/ardatan/graphql-tools/commit/0d203ab57671cfa6d4417e60b08b3224a65bec91)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `@requires` with arguments like
  `@requires(fields: "price(currency: 'USD')")`

## 2.2.2

### Patch Changes

- [`63cab60`](https://github.com/ardatan/graphql-tools/commit/63cab60dca3f36614ff5cb26869e1e7d3e939c50)
  Thanks [@ardatan](https://github.com/ardatan)! - Use type definition merger instead of
  \`concatAST\` to merge type definitions for creating a subschema for Federation

## 2.2.1

### Patch Changes

- [`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)
  Thanks [@ardatan](https://github.com/ardatan)! - Fail on query planning phase if the query plan is
  not successful before the actual execution

- Updated dependencies
  [[`33e8146`](https://github.com/ardatan/graphql-tools/commit/33e8146e33aa17790ee76d14e52f62c684ee1b16)]:
  - @graphql-tools/delegate@10.0.16

## 2.2.0

### Minor Changes

- [#6368](https://github.com/ardatan/graphql-tools/pull/6368)
  [`334d301`](https://github.com/ardatan/graphql-tools/commit/334d301007d4d73e09182f22a76bdce1937ec8af)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Expose the loaded supergrapth SDL in
  the `schema` event

## 2.1.4

### Patch Changes

- [`167b47c`](https://github.com/ardatan/graphql-tools/commit/167b47cbc6ae31ce046cf6cc17365813d2481d4c)
  Thanks [@ardatan](https://github.com/ardatan)! - New options to configure query batching and
  batched delegation

  ```ts
  {
    batchingOptions: {
      dataLoaderOptions: {
        maxBatchSize: 10, // Limits the query batching
      }
    },
    batchDelegateOptions: {
      maxBatchSize: 10, // Limits the batch delegation
    }
  }
  ```

  Learn more about these here;
  [Batch Delegation](https://the-guild.dev/graphql/stitching/docs/approaches/schema-extensions#batch-delegation-array-batching)
  [Query Batching](https://the-guild.dev/graphql/stitching/docs/getting-started/remote-subschemas#batch-the-executor-query-batching)

## 2.1.3

### Patch Changes

- [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not apply type merging for non-resolvable
  entities

- Updated dependencies
  [[`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29),
  [`d54b21a`](https://github.com/ardatan/graphql-tools/commit/d54b21a235f9632d320a32f15594ecd70b5eae29)]:
  - @graphql-tools/delegate@10.0.15

## 2.1.2

### Patch Changes

- [#6355](https://github.com/ardatan/graphql-tools/pull/6355)
  [`c6d175b`](https://github.com/ardatan/graphql-tools/commit/c6d175b2c1de640d2156ba0b2c69bf7e8884d98f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle errors coming from subgraphs correctly
  when a root field is shared by different subgraphs

  - If subgraph A returns an error for `Query.foo`, and subgraph B returns the data, ignore the
    error and keep it for null fields.
  - If both subgraphs return errors, return them as `AggregateError` then return them to the gateway
    result.

- Updated dependencies
  [[`8094c37`](https://github.com/ardatan/graphql-tools/commit/8094c3733c745b2ccb7adcca38024c82c42319a0),
  [`97c88a0`](https://github.com/ardatan/graphql-tools/commit/97c88a0844eff2ace5914b8e18a2d32dc5b8c265)]:
  - @graphql-tools/delegate@10.0.14
  - @graphql-tools/executor-http@1.1.5

## 2.1.1

### Patch Changes

- [#6293](https://github.com/ardatan/graphql-tools/pull/6293)
  [`3f301dc`](https://github.com/ardatan/graphql-tools/commit/3f301dc74a99ea1db28fe75923fa26ba2736d9f7)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not use `entryPoints` for `MergedTypeConfig`
  if there is only one

- [#6278](https://github.com/ardatan/graphql-tools/pull/6278)
  [`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c)
  Thanks [@ardatan](https://github.com/ardatan)! - Exclude `@defer` in the subgraph requests

- Updated dependencies
  [[`66c99d9`](https://github.com/ardatan/graphql-tools/commit/66c99d9c9e480cc4e1569b032952caea0ff69c0c),
  [`3f301dc`](https://github.com/ardatan/graphql-tools/commit/3f301dc74a99ea1db28fe75923fa26ba2736d9f7)]:
  - @graphql-tools/delegate@10.0.12
  - @graphql-tools/stitch@9.2.10
  - @graphql-tools/utils@10.2.3

## 2.1.0

### Minor Changes

- [#6267](https://github.com/ardatan/graphql-tools/pull/6267)
  [`d5dd794`](https://github.com/ardatan/graphql-tools/commit/d5dd794352878aec9b0d543dfe2e6995142dddff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add `delayInSeconds` to the `failure`
  event to give users more control on failure handling.

- [#6267](https://github.com/ardatan/graphql-tools/pull/6267)
  [`d5dd794`](https://github.com/ardatan/graphql-tools/commit/d5dd794352878aec9b0d543dfe2e6995142dddff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add a the ability to start polling with
  a delay. This ease the handling of failure handling, allowing to restart the manager and
  respecting GraphOS minimum retry delay.

### Patch Changes

- [#6267](https://github.com/ardatan/graphql-tools/pull/6267)
  [`d5dd794`](https://github.com/ardatan/graphql-tools/commit/d5dd794352878aec9b0d543dfe2e6995142dddff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix Supergraph Manager Event Emitter
  not calling every listener when at least one has been registered using `once` method.

## 2.0.1

### Patch Changes

- [#6238](https://github.com/ardatan/graphql-tools/pull/6238)
  [`0f7059b`](https://github.com/ardatan/graphql-tools/commit/0f7059beb218d0012c48e121c55e7db386796bee)
  Thanks [@ardatan](https://github.com/ardatan)! - Merge the elements of the lists if the root field
  is shared across different subgraphs

  ```graphql
  type Query {
    products: [Product] # If this field is returned by multiple subgraphs, the elements of the lists will be merged
  }
  ```

- Updated dependencies
  [[`0f7059b`](https://github.com/ardatan/graphql-tools/commit/0f7059beb218d0012c48e121c55e7db386796bee)]:
  - @graphql-tools/utils@10.2.2

## 2.0.0

### Major Changes

- [#6227](https://github.com/ardatan/graphql-tools/pull/6227)
  [`85c383f`](https://github.com/ardatan/graphql-tools/commit/85c383fbb44eeb2a0509480d84ca0b12811bc3ca)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING CHANGES:
  - `getSubschemasFromSupergraphSdl` has been removed in favor of the new
    `getStitchingOptionsFromSupergraphSdl`, and it returns the options for `stitchSchemas` instead
    of the map of subschemas
  - `onExecutor` has been removed in favor of `onSubschemaConfig`
  - To change the default HTTP executor options, use `httpExecutorOpts` instead of `onExecutor`

### Patch Changes

- [#6223](https://github.com/ardatan/graphql-tools/pull/6223)
  [`db29280`](https://github.com/ardatan/graphql-tools/commit/db29280ef4b058857923ed8a207052fe06ba5fa0)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/fetch@^0.9.17` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.17)
    (to `dependencies`)

## 1.1.36

### Patch Changes

- [#6194](https://github.com/ardatan/graphql-tools/pull/6194)
  [`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle interface objects in a different way

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

- [#6187](https://github.com/ardatan/graphql-tools/pull/6187)
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect @provides to optimize the query plan

- [#6188](https://github.com/ardatan/graphql-tools/pull/6188)
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e)
  Thanks [@ardatan](https://github.com/ardatan)! - If two different subschemas have the root field,
  use the same field to resolve missing fields instead of applying a type merging in advance

- Updated dependencies
  [[`7368829`](https://github.com/ardatan/graphql-tools/commit/73688291af0c8cb2fe550fe8c74fd8af84cb360f),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`dfccfbf`](https://github.com/ardatan/graphql-tools/commit/dfccfbfd6633dd576f660c648f3c6cecff3667a1),
  [`0134f7f`](https://github.com/ardatan/graphql-tools/commit/0134f7ffe5383603961d69337bfa5bceefb3ed74),
  [`eec9d3d`](https://github.com/ardatan/graphql-tools/commit/eec9d3d86a1a0a748321263ef9bc4db13fd3c35c),
  [`03a47b1`](https://github.com/ardatan/graphql-tools/commit/03a47b181516e17f33c84f364df9482c2d1ba502),
  [`e10c13a`](https://github.com/ardatan/graphql-tools/commit/e10c13a60e344b9217dc77a7cac50ec447feda7e),
  [`0827497`](https://github.com/ardatan/graphql-tools/commit/08274975ccb1524d88fc8b95f42deb1cba05425d)]:
  - @graphql-tools/delegate@10.0.11
  - @graphql-tools/schema@10.0.4
  - @graphql-tools/stitch@9.2.9
  - @graphql-tools/utils@10.2.1

## 1.1.35

### Patch Changes

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

- [#6143](https://github.com/ardatan/graphql-tools/pull/6143)
  [`04d5431`](https://github.com/ardatan/graphql-tools/commit/04d5431deccc42d75b6ae2ae8ed941dac4c3679a)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement interface objects support

- Updated dependencies
  [[`a83da08`](https://github.com/ardatan/graphql-tools/commit/a83da087e24929ed0734a2cff63c97bd45cc9eb4),
  [`fc9c71f`](https://github.com/ardatan/graphql-tools/commit/fc9c71fbc9057a8e32e0d8813b23819c631afa65),
  [`cd962c1`](https://github.com/ardatan/graphql-tools/commit/cd962c1048b21c0a6f91c943860089b050ac5f5e)]:
  - @graphql-tools/delegate@10.0.10
  - @graphql-tools/stitch@9.2.8

## 1.1.34

### Patch Changes

- [#6130](https://github.com/ardatan/graphql-tools/pull/6130)
  [`508ae6b`](https://github.com/ardatan/graphql-tools/commit/508ae6bbe36248926b58719d71042c4d608782a1)
  Thanks [@ardatan](https://github.com/ardatan)! - Support overrides on interfaces See
  [packages/federation/test/fixtures/federation-compatibility/override-type-interface/supergraph.graphql](https://github.com/ardatan/graphql-tools/blob/739264d5f7f2f4254d4d41f965d664ae04c37e45/packages/federation/test/fixtures/federation-compatibility/override-type-interface/supergraph.graphql)
  for more details

## 1.1.33

### Patch Changes

- [`361052a`](https://github.com/ardatan/graphql-tools/commit/361052a5fcc7f3bb00092efa3efd5767b9ac1ee6)
  Thanks [@ardatan](https://github.com/ardatan)! - Small fix: check all final types to find orphan
  interfaces

## 1.1.32

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
  - @graphql-tools/stitch@9.2.7

## 1.1.31

### Patch Changes

- [`98b2795`](https://github.com/ardatan/graphql-tools/commit/98b2795120e05dec1d91b57422f50d38c088b630)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on unavailable field selection, and
  key object projection

- Updated dependencies
  [[`98b2795`](https://github.com/ardatan/graphql-tools/commit/98b2795120e05dec1d91b57422f50d38c088b630)]:
  - @graphql-tools/stitch@9.2.6

## 1.1.30

### Patch Changes

- [`9238e14`](https://github.com/ardatan/graphql-tools/commit/9238e140862d33c6df072c42054fc642eda37840)
  Thanks [@ardatan](https://github.com/ardatan)! - Improvements on field merging and extraction of
  unavailable fields

- Updated dependencies
  [[`9238e14`](https://github.com/ardatan/graphql-tools/commit/9238e140862d33c6df072c42054fc642eda37840),
  [`4ce3ffc`](https://github.com/ardatan/graphql-tools/commit/4ce3ffc8ec927651587e0aa236fdd573e883ef21)]:
  - @graphql-tools/stitch@9.2.5
  - @graphql-tools/delegate@10.0.8

## 1.1.29

### Patch Changes

- [#6109](https://github.com/ardatan/graphql-tools/pull/6109)
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)
  Thanks [@ardatan](https://github.com/ardatan)! - Show responses in debug logging with `DEBUG` env
  var

- Updated dependencies
  [[`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa),
  [`074fad4`](https://github.com/ardatan/graphql-tools/commit/074fad4144095fbefe449ced397b7707963bd7aa)]:
  - @graphql-tools/delegate@10.0.7
  - @graphql-tools/stitch@9.2.3

## 1.1.28

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

- Updated dependencies
  [[`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4),
  [`9bca9e0`](https://github.com/ardatan/graphql-tools/commit/9bca9e03915a2e12d164e355be9aed389b0de3a4),
  [`243c353`](https://github.com/ardatan/graphql-tools/commit/243c353412921cf0063f963ee46b9c63d2f33b41)]:
  - @graphql-tools/stitch@9.2.0
  - @graphql-tools/delegate@10.0.5

## 1.1.27

### Patch Changes

- [#6086](https://github.com/ardatan/graphql-tools/pull/6086)
  [`f538e50`](https://github.com/ardatan/graphql-tools/commit/f538e503c3cdb152bd29f77804217100cac0f648)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle @inaccessible types correctly

## 1.1.26

### Patch Changes

- [#6071](https://github.com/ardatan/graphql-tools/pull/6071)
  [`6cf507f`](https://github.com/ardatan/graphql-tools/commit/6cf507fc70d2474c71c8604ab117d01af76376e1)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle inaccessible enum values

## 1.1.25

### Patch Changes

- [`e09c383`](https://github.com/ardatan/graphql-tools/commit/e09c383a540f84f56db141466b711f88fce8548d)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect fields with specified types

## 1.1.24

### Patch Changes

- [`458ef46`](https://github.com/ardatan/graphql-tools/commit/458ef46536db003edc399587feabfcee7b186830)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove extra logs

## 1.1.23

### Patch Changes

- [`2202768`](https://github.com/ardatan/graphql-tools/commit/220276800d271e7c6fbc43339eb779b618c82e68)
  Thanks [@ardatan](https://github.com/ardatan)! - Federation v1 support improvements

## 1.1.22

### Patch Changes

- [`4620bb2`](https://github.com/ardatan/graphql-tools/commit/4620bb2a352fd0e645950aaae8bb54cbc7c85ce7)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle unspecified key fields

## 1.1.21

### Patch Changes

- [`14f4fae`](https://github.com/ardatan/graphql-tools/commit/14f4faec87b1423c5541dab16dc2c5c1298edcf7)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle orphan scalars with directives

## 1.1.20

### Patch Changes

- [`b78ce7e`](https://github.com/ardatan/graphql-tools/commit/b78ce7e42c8d016d972b125a86508f5ab78d57a6)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle orphan union types

## 1.1.19

### Patch Changes

- [#5956](https://github.com/ardatan/graphql-tools/pull/5956)
  [`d4395dd`](https://github.com/ardatan/graphql-tools/commit/d4395dd7d21db3becdf51cc0508e35d246dcbe1e)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle orphan types

- Updated dependencies
  [[`8199416`](https://github.com/ardatan/graphql-tools/commit/81994160488aad1114b0d130083bcf694fe13aba),
  [`baf3c28`](https://github.com/ardatan/graphql-tools/commit/baf3c28f43dcfafffd15386daeb153bc2895c1b3)]:
  - @graphql-tools/wrap@10.0.3
  - @graphql-tools/utils@10.1.1

## 1.1.18

### Patch Changes

- [#5946](https://github.com/ardatan/graphql-tools/pull/5946)
  [`107c021`](https://github.com/ardatan/graphql-tools/commit/107c021aa191f0654c45ed72b45d650993e2142f)
  Thanks [@ardatan](https://github.com/ardatan)! - If an interface or scalar type is not annotated
  for a subgraph explicitly, consider them as a shared type

## 1.1.17

### Patch Changes

- [#5913](https://github.com/ardatan/graphql-tools/pull/5913)
  [`83c0af0`](https://github.com/ardatan/graphql-tools/commit/83c0af0713ff2ce55ccfb97a1810ecfecfeab703)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/delegate@^10.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/10.0.3)
    (from `^10.0.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor-http@^1.0.8` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.0.8)
    (from `^1.0.6`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/merge@^9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/merge/v/9.0.1)
    (from `^9.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.2)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/stitch@^9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/stitch/v/9.0.4)
    (from `^9.0.2`, in `dependencies`)
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
  - @graphql-tools/delegate@10.0.4
  - @graphql-tools/executor-http@1.0.9
  - @graphql-tools/merge@9.0.3
  - @graphql-tools/schema@10.0.3
  - @graphql-tools/stitch@9.0.5
  - @graphql-tools/wrap@10.0.2

## 1.1.16

### Patch Changes

- [`7583729`](https://github.com/ardatan/graphql-tools/commit/7583729718ffd528bba5d1c5c4ea087975102c1f)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix `getSubschemaForFederationWithTypeDefs` for
  non-supergraph merging of subgraphs

## 1.1.15

### Patch Changes

- [#5885](https://github.com/ardatan/graphql-tools/pull/5885)
  [`2d76909`](https://github.com/ardatan/graphql-tools/commit/2d76909908a918562a9f7599825b70ae60f91127)
  Thanks [@ardatan](https://github.com/ardatan)! - Avoid creating invalid schema when there is no
  entity

## 1.1.14

### Patch Changes

- [#5878](https://github.com/ardatan/graphql-tools/pull/5878)
  [`ba062ff`](https://github.com/ardatan/graphql-tools/commit/ba062ff4880f6922eaddfcbd746782275a8f689e)
  Thanks [@darren-west](https://github.com/darren-west)! - fix: buildSubgraphSchema with no entity
  keys

## 1.1.13

### Patch Changes

- [`974df8a`](https://github.com/ardatan/graphql-tools/commit/974df8a1a1bca422bac5d971a3f8029cd9728efd)
  Thanks [@ardatan](https://github.com/ardatan)! - Debug logging & expose the subgraph schema

- Updated dependencies
  [[`b798b3b`](https://github.com/ardatan/graphql-tools/commit/b798b3b0a54f634bf2dd2275ef47f5263a5ce238)]:
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
