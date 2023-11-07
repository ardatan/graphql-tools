import { DocumentNode, parse, print } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createQueryPlanExecutor } from '../src/executor';
import { processSupergraphSdl } from '../src/processSupergraph';
import { createQueryPlannerFromProcessedSupergraph } from '../src/queryPlanner';
import { PlanNode } from '../src/types';

interface QuerySample {
  document: DocumentNode;
  variables?: Record<string, any>;
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
      my_foo_id: 'A',
    },
  },
  Lists: {
    document: parse(/* GraphQL */ `
      query Test($my_foo_ids: [ID!]!) {
        foos(ids: $my_foo_ids) {
          bar
          baz
        }
      }
    `),
  },
};

describe('Query Planner & Executor', () => {
  const supergraphSdl = /* GraphQL */ `
    directive @resolver(
      operation: String!
      subgraph: String!
    ) repeatable on OBJECT | FIELD_DEFINITION
    directive @source(
      subgraph: String!
    ) repeatable on OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION
    directive @variable(
      name: String!
      select: String
      subgraph: String!
    ) repeatable on OBJECT | FIELD_DEFINITION

    type Query @source(subgraph: "A") @source(subgraph: "B") {
      foo(id: ID! @source(subgraph: "A") @source(subgraph: "B")): Foo!
        @source(subgraph: "A")
        @resolver(operation: "query RootFooA($id:ID!) { foo(id: $id) }", subgraph: "A")
        @source(subgraph: "B")
        @resolver(operation: "query RootFooB($id:ID!) { foo(id: $id) }", subgraph: "B")

      foos: [Foo!]!
        @source(subgraph: "A")
        @resolver(operation: "query RootFoosA { foos }", subgraph: "A")

      someOtherField(fooId: ID! @source(subgraph: "C")): String! @source(subgraph: "C")
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
        operation: "query ResolveFooFromB($Foo_id: ID!) { foo(id: $Foo_id) }"
        subgraph: "B"
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
  const processedSupergraph = processSupergraphSdl(supergraphSdl);
  const queryPlanner = createQueryPlannerFromProcessedSupergraph(processedSupergraph);
  Object.entries(queries).forEach(([name, { document, variables }]) => {
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
              foos: [Foo!]!
            }

            type Foo {
              id: ID!
              bar: String!
              qux: String!
            }
          `,
          resolvers: {
            Query: {
              foo: () => ({
                id: 'A',
                bar: 'A',
                qux: 'A',
              }),
              foos: () => [
                {
                  id: 'A',
                  bar: 'A',
                  qux: 'A',
                },
                {
                  id: 'B',
                  bar: 'B',
                  qux: 'B',
                },
              ],
            },
          },
        });
        const bSchema = makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              foo(id: ID!): Foo!
            }

            type Foo {
              id: ID!
              baz: String!
              child: Foo
            }
          `,
          resolvers: {
            Query: {
              foo: () => ({
                id: 'B',
                baz: 'B',
                child: {
                  id: 'B',
                  qux: 'B',
                },
              }),
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
        expect(result).toMatchSnapshot(`query-result-${name}`);
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
      if (planNode.provided.variables) {
        serializedResolveNode.provided.variables = serializeMap(planNode.provided.variables);
      }
      if (planNode.provided.selections) {
        serializedResolveNode.provided.selections = serializeMap(planNode.provided.selections);
      }
      if (planNode.provided.selectionFields) {
        serializedResolveNode.provided.selectionFields = planNode.provided.selectionFields;
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
    return serializedResolveNode;
  }
  return {
    type: planNode.type,
    nodes: planNode.nodes.map(serializePlanNode),
  };
}
