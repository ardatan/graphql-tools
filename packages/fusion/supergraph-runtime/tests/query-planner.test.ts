import { createQueryPlannerFromProcessedSupergraph } from "../src/queryPlanner";
import { parse, print } from "graphql";
import { PlanNode } from "../src/types";
import { inspect } from "util";
import { processSupergraphSdl } from "../src/processSupergraph";
import { createQueryPlanExecutor } from "../src/executor";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createDefaultExecutor } from "@graphql-tools/delegate";

// Follow test steps in Chillicream

describe('createQueryPlannerFromSupergraph', () => {
  it('test', async () => {
    const supergraphSdl = /* GraphQL */`
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
      type Query
          @source(subgraph: "A")
          @source(subgraph: "B") {
        foo(id: ID! @source(subgraph: "A") @source(subgraph: "B")): Foo!
          @source(subgraph: "A")
          @resolver(operation: "query RootFooA($Foo_id:ID!) { foo(id: $Foo_id) }", subgraph: "A")
          @source(subgraph: "B")
          @resolver(operation: "query RootFooB($Foo_id:ID!) { foo(id: $Foo_id) }", subgraph: "B")

        someOtherField(fooId: ID! @source(subgraph: "C")): String! @source(subgraph: "C")
      }

      type Foo
          @source(subgraph: "A")
          @source(subgraph: "B")
          @variable(name: "Foo_id", select: "id", subgraph: "A")
          @variable(name: "Foo_id", select: "id", subgraph: "B")
          @resolver(operation: "query ResolveFooFromA($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "A")
          @resolver(operation: "query ResolveFooFromB($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "B") {
        id: ID!
          @source(subgraph: "A")
          @source(subgraph: "B")

        bar: String!
          @source(subgraph: "A")
        baz: String!
          @source(subgraph: "B")

        qux: String!
          @source(subgraph: "A")

        child: Foo
          @source(subgraph: "B")

        otherField: String!
          @variable(name: "fooId", select: "id", subgraph: "A")
          @variable(name: "fooId", select: "id", subgraph: "B")
          @resolver(operation: "query RootSomeOtherFieldC($fooId:ID!) { someOtherField(fooId: $fooId) }", subgraph: "C")
      }
    `;
    const processedSupergraph = processSupergraphSdl(supergraphSdl);
    const queryPlanner = createQueryPlannerFromProcessedSupergraph(processedSupergraph);
    const plan = queryPlanner.plan({
      document: parse(/* GraphQL */`
        query Test($id: ID!) {
          foo(id: $id) {
            bar
            baz
            child {
              qux
              otherField
            }
          }
        }
      `),
      operationName: 'test',
    });
    console.log(inspect(serializePlanNode(plan), false, Infinity));
    const aSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */`
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
          foo: () => ({
            id: 'A',
            bar: 'A',
            qux: 'A',
          }),
        },
      },
    })
    const bSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */`
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
    })
    const cSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */`
        type Query {
          someOtherField(fooId: ID!): String!
        }
      `,
      resolvers: {
        Query: {
          someOtherField: (_, { fooId }) => `C ${fooId}`,
        },
      },
    })
    const executor = createQueryPlanExecutor({
      subgraphExecutors: new Map([
        ['A', createDefaultExecutor(aSchema)],
        ['B', createDefaultExecutor(bSchema)],
        ['C', createDefaultExecutor(cSchema)],
      ]),
    });
    const result = await executor({
      queryPlan: plan,
      variables: {
        Foo_id: 'A',
      },
    });
    console.log(inspect(result, false, Infinity));
  })
})

function serializeMap<K extends string, V>(map: Map<K, V>): Record<K,V> {
  return Object.fromEntries(map.entries()) as Record<K,V>;
}

function serializePlanNode(planNode: PlanNode) {
  if (planNode.type === 'Resolve') {
    const serializedResolveNode: any = {
      type: 'Resolve',
      subgraph: planNode.subgraph,
      document: print(planNode.document),
    }
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
  }
}
