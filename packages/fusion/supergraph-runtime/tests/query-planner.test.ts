import { DocumentNode, parse, print } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createQueryPlanExecutor } from '../src/executor';
import { createQueryPlannerFromProcessedSupergraph } from '../src/queryPlanner';
import { PlanNode } from '../src/types';

interface QuerySample {
  document: DocumentNode;
  variables?: Record<string, any>;
  expectedResult: any;
}

const queries: Record<string, QuerySample> = {
  Regular: {
    document: parse(/* GraphQL */ `
      query Test($my_foo_id: ID!) {
        foo(id: $my_foo_id) {
          bar
          baz
          child {
            qux
            otherField
          }
        }
      }
    `),
    variables: {
      my_foo_id: 'MY',
    },
    expectedResult: {
      foo: {
        bar: 'MY bar',
        baz: 'MY baz',
        child: {
          qux: 'MY child qux',
          otherField: 'C MY child',
        },
      },
    },
  },
  Lists: {
    document: parse(/* GraphQL */ `
      query Test {
        foos {
          bar
          baz
          child {
            baz
          }
        }
      }
    `),
    expectedResult: {
      foos: [
        {
          bar: 'A bar',
          baz: 'A baz',
          child: {
            baz: 'A child baz',
          },
        },
        {
          bar: 'B bar',
          baz: 'B baz',
          child: {
            baz: 'B child baz',
          },
        },
      ],
    },
  },
};

describe('Query Planner & Executor', () => {
  const supergraphSdl = /* GraphQL */ `
    directive @resolver(
      operation: String!
      subgraph: String!
      kind: ResolverKind = SINGLE
    ) repeatable on OBJECT | FIELD_DEFINITION
    directive @source(
      subgraph: String!
    ) repeatable on OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION
    directive @variable(
      name: String!
      select: String
      subgraph: String!
    ) repeatable on OBJECT | FIELD_DEFINITION

    enum ResolverKind {
      FETCH
      BATCH
    }

    type Query {
      foo(id: ID!): Foo!
        @resolver(operation: "query RootFooA($id:ID!) { foo(id: $id) }", subgraph: "A")

      foos(ids: [ID!]): [Foo!]!
        @resolver(operation: "query ResolveFoosFromB { foos }", subgraph: "B")
    }

    type Foo
      @source(subgraph: "A")
      @source(subgraph: "B")
      @variable(name: "Foo_id", select: "id", subgraph: "A")
      @variable(name: "Foo_id", select: "id", subgraph: "B")
      @resolver(
        operation: "query ResolveFooFromA($Foo_id: ID!) { foo(id: $Foo_id) }"
        subgraph: "A"
      )
      @resolver(
        operation: "query ResolveFoosFromB($Foo_id: [ID!]!) { foos(ids: $Foo_id) }"
        subgraph: "B"
        kind: BATCH
      ) {
      id: ID! @source(subgraph: "A") @source(subgraph: "B")

      bar: String! @source(subgraph: "A")
      baz: String! @source(subgraph: "B")

      qux: String! @source(subgraph: "A")

      child: Foo @source(subgraph: "B")

      otherField: String!
        @variable(name: "fooId", select: "id", subgraph: "A")
        @variable(name: "fooId", select: "id", subgraph: "B")
        @resolver(
          operation: "query RootSomeOtherFieldC($fooId:ID!) { someOtherField(fooId: $fooId) }"
          subgraph: "C"
        )
    }
  `;
  const queryPlanner = createQueryPlannerFromProcessedSupergraph(supergraphSdl);
  Object.entries(queries).forEach(([name, { document, variables, expectedResult }]) => {
    describe(name, () => {
      let plan: PlanNode;
      it('creates a serializable query plan', async () => {
        plan = queryPlanner.plan({ document });
        expect(serializePlanNode(plan)).toMatchSnapshot(`query-result-${name}`);
      });
      it('executes the plan', async () => {
        const aSchema = makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              foo(id: ID!): Foo!
            }

            type Foo {
              id: ID!
              bar: String!
              qux: String!
            }
          `,
          resolvers: {
            Query: {
              foo: (_, { id }) => ({
                id,
                bar: `${id} bar`,
                qux: `${id} qux`,
              }),
            },
          },
        });
        const bSchema = makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              foo(id: ID!): Foo!
              foos(ids: [ID!]): [Foo!]!
            }

            type Foo {
              id: ID!
              baz: String!
              child: Foo
            }
          `,
          resolvers: {
            Query: {
              foo: (_, { id }) => ({
                id,
                baz: `${id} baz`,
                child: {
                  id: `${id} child`,
                  baz: `${id} child baz`,
                },
              }),
              foos: (_, { ids = ['A', 'B'] }: { ids: string[] }) =>
                ids.map(id => ({
                  id,
                  baz: `${id} baz`,
                  child: {
                    id: `${id} child`,
                    baz: `${id} child baz`,
                  },
                })),
            },
          },
        });
        const cSchema = makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              someOtherField(fooId: ID!): String!
            }
          `,
          resolvers: {
            Query: {
              someOtherField: (_, { fooId }) => `C ${fooId}`,
            },
          },
        });
        const executor = createQueryPlanExecutor({
          subgraphExecutors: new Map([
            ['A', createDefaultExecutor(aSchema)],
            ['B', createDefaultExecutor(bSchema)],
            ['C', createDefaultExecutor(cSchema)],
          ]),
        });
        const result = await executor({
          queryPlan: plan,
          variables,
        });
        expect(result).toMatchObject({
          data: expectedResult,
        });
      });
    });
  });
});

function serializeMap<K extends string, V>(map: Map<K, V>): Record<K, V> {
  return Object.fromEntries(map.entries()) as Record<K, V>;
}

function serializePlanNode(planNode: PlanNode): any {
  if (planNode.type === 'Resolve') {
    const serializedResolveNode: any = {
      type: 'Resolve',
      subgraph: planNode.subgraph,
      document: print(planNode.document),
    };
    if (planNode.provided) {
      serializedResolveNode.provided = {};
      if (planNode.provided.selections) {
        serializedResolveNode.provided.selections = serializeMap(planNode.provided.selections);
      }
      if (planNode.provided.selectionFields) {
        serializedResolveNode.provided.selectionFields = planNode.provided.selectionFields;
      }
      if (planNode.provided.variablesInSelections) {
        serializedResolveNode.provided.variablesInSelections =
          planNode.provided.variablesInSelections;
      }
    }
    if (planNode.required) {
      serializedResolveNode.required = {};
      if (planNode.required.variables) {
        serializedResolveNode.required.variables = planNode.required.variables;
      }
      if (planNode.required.selections) {
        serializedResolveNode.required.selections = serializeMap(planNode.required.selections);
      }
    }
    if (planNode.batch) {
      serializedResolveNode.batch = planNode.batch;
    }
    return serializedResolveNode;
  }
  return {
    type: planNode.type,
    nodes: planNode.nodes.map(serializePlanNode),
  };
}
