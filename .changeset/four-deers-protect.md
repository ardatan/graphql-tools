---
'@graphql-tools/federation': patch
'@graphql-tools/delegate': patch
---

Fix the bug happens when a merged field is a computed field requires another computed field requires a field from the initial subschema.

In the following test case, `totalOrdersPrices` needs `userOrders` which needs `lastName` from initial `Query.user`.
So the bug was skipping the dependencies of `userOrders` because it assumed `lastName` already there by mistake.

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
          user: User
        }
      `,
      resolvers: {
        Query: {
          user: () => {
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
        User: {
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
        User: {
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
            User: {
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
            User: {
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
        user: {
          aggregatedOrdersByStatus: 1,
          totalOrdersPrices: 0,
        },
      },
    });
```
