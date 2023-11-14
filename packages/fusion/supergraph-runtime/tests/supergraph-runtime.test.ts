import { buildSchema, getOperationAST, GraphQLObjectType, Kind, parse, print } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  createExecutableResolverOperationNodesWithDependencyMap,
  executeResolverOperationNodesWithDependenciesInParallel,
} from '../src/execution.js';
import { FlattenedFieldNode, FlattenedSelectionSet } from '../src/flattenSelections.js';
import { createResolveNode, visitFieldNodeForTypeResolvers } from '../src/query-planning.js';
import { serializeResolverOperationNode } from '../src/types.js';

describe('Query Planning', () => {
  describe('visitForTypeResolver', () => {
    it('resolves a type from a different subgraph with missing fields on one level', () => {
      const fieldNodeInText = /* GraphQL */ `
      myFoo {
        baz
      }
    `;

      const operationInText = /* GraphQL */ `
      query Test {
        ${fieldNodeInText}
      }
    `;

      const operationDoc = parse(operationInText, { noLocation: true });

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const { newFieldNode, resolverOperationDocument } = createResolveNode(
        'A',
        selections[0],
        {
          operation: /* GraphQL */ `
            query FooFromB($Foo_id: ID!) {
              foo(id: $Foo_id)
            }
          `,
          subgraph: 'B',
          kind: 'FETCH',
        },
        [
          {
            name: 'Foo_id',
            select: 'id',
            subgraph: 'A',
          },
        ],
        selections[0].selectionSet?.selections as FlattenedFieldNode[],
        { currentVariableIndex: 0 },
      );

      expect(print(newFieldNode)).toBe('myFoo {\n  baz\n  __variable_0: id\n}');
      expect(print(resolverOperationDocument)).toBe(
        /* GraphQL */ `
query FooFromB($__variable_0: ID!) {
  __export: foo(id: $__variable_0) {
    baz
  }
}
    `.trim(),
      );
    });
    it('resolves a field on one level', () => {
      const fieldNodeInText = /* GraphQL */ `
      extraField {
        baz
      }
    `;

      const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          ${fieldNodeInText}
        }
      }
    `;

      const operationDoc = parse(operationInText, { noLocation: true });

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const myFooSelection = selections[0];

      const extraFieldSelection = myFooSelection.selectionSet!.selections[0] as FlattenedFieldNode;

      const { newFieldNode, resolverOperationDocument } = createResolveNode(
        'A',
        myFooSelection,
        {
          operation: /* GraphQL */ `
            query ExtraFieldFromC($Foo_id: ID!) {
              extraFieldForFoo(id: $Foo_id)
            }
          `,
          subgraph: 'B',
          kind: 'FETCH',
        },
        [
          {
            name: 'Foo_id',
            select: 'id',
            subgraph: 'A',
          },
        ],
        extraFieldSelection.selectionSet!.selections as FlattenedFieldNode[],
        { currentVariableIndex: 0 },
      );

      expect(print(newFieldNode)).toBe(
        /* GraphQL */ `
myFoo {
  extraField {
    baz
  }
  __variable_0: id
}
`.trim(),
      );

      expect(print(resolverOperationDocument)).toBe(
        /* GraphQL */ `
query ExtraFieldFromC($__variable_0: ID!) {
  __export: extraFieldForFoo(id: $__variable_0) {
    baz
  }
}`.trim(),
      );
    });
  });
  describe('visitFieldNodeForTypeResolvers', () => {
    it('resolves a type from different subgraphs with missing fields on one level', () => {
      const fieldNodeInText = /* GraphQL */ `
      myFoo {
        bar
        baz
      }
    `;
      const typeDefInText = /* GraphQL */ `
        type Foo
          @variable(name: "Foo_id", select: "id", subgraph: "A")
          @resolver(operation: "query FooFromB($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "B")
          @resolver(operation: "query FooFromC($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "C") {
          id: ID! @source(subgraph: "A")
          bar: String! @source(subgraph: "B")
          baz: String! @source(subgraph: "C")
        }
      `;

      const schemaInText = /* GraphQL */ `
        type Query {
          myFoo: Foo!
        }

        ${typeDefInText}
      `;

      const supergraph = buildSchema(schemaInText, {
        assumeValid: true,
        assumeValidSDL: true,
      });

      const operationInText = /* GraphQL */ `
      query Test {
        ${fieldNodeInText}
      }
    `;

      const operationDoc = parse(operationInText, { noLocation: true });

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const type = supergraph.getType('Foo') as GraphQLObjectType;

      const { newFieldNode, resolverOperationNodes } = visitFieldNodeForTypeResolvers(
        'A',
        selections[0],
        type,
        supergraph,
        { currentVariableIndex: 0 },
      );

      expect(print(newFieldNode)).toBe('myFoo {\n  __variable_0: id\n  __variable_1: id\n}');

      expect(resolverOperationNodes.map(serializeResolverOperationNode)).toStrictEqual([
        {
          subgraph: 'B',
          resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_0: ID!) {
  __export: foo(id: $__variable_0) {
    bar
  }
}
        `.trim(),
        },
        {
          subgraph: 'C',
          resolverOperationDocument: /* GraphQL */ `
query FooFromC($__variable_1: ID!) {
  __export: foo(id: $__variable_1) {
    baz
  }
}
        `.trim(),
        },
      ]);
    });
    it('resolves a type from different subgraphs with missing fields on nested levels', () => {
      const fieldNodeInText = /* GraphQL */ `
      myFoo {
        bar
        baz
        child {
          bar
          child {
            bar
          }
        }
      }
    `;
      const typeDefInText = /* GraphQL */ `
        type Foo
          @variable(name: "Foo_id", select: "id", subgraph: "A")
          @variable(name: "Foo_id", select: "id", subgraph: "B")
          @variable(name: "Foo_id", select: "id", subgraph: "C")
          @resolver(operation: "query FooFromB($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "B")
          @resolver(operation: "query FooFromC($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "C") {
          id: ID! @source(subgraph: "A") @source(subgraph: "B") @source(subgraph: "C")
          bar: String! @source(subgraph: "B")
          baz: String! @source(subgraph: "C")
          child: Foo @source(subgraph: "C")
        }
      `;

      const schemaInText = /* GraphQL */ `
        type Query {
          myFoo: Foo!
        }

        ${typeDefInText}
      `;

      const supergraph = buildSchema(schemaInText, {
        assumeValid: true,
        assumeValidSDL: true,
      });

      const operationInText = /* GraphQL */ `
      query Test {
        ${fieldNodeInText}
      }
    `;

      const operationDoc = parse(operationInText, { noLocation: true });

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const type = supergraph.getType('Foo') as GraphQLObjectType;

      const { newFieldNode, resolverOperationNodes } = visitFieldNodeForTypeResolvers(
        'A',
        selections[0],
        type,
        supergraph,
        { currentVariableIndex: 0 },
      );
      /*
      for (const node of resolverOperationNodes) {
        console.log(inspect(serializeNode(node), undefined, Infinity))
      }
  */
      expect(print(newFieldNode)).toBe('myFoo {\n  __variable_0: id\n  __variable_1: id\n}');

      expect(resolverOperationNodes.map(serializeResolverOperationNode)).toStrictEqual([
        {
          subgraph: 'B',
          resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_0: ID!) {
  __export: foo(id: $__variable_0) {
    bar
  }
}
        `.trim(),
        },
        {
          subgraph: 'C',
          resolverOperationDocument: /* GraphQL */ `
query FooFromC($__variable_1: ID!) {
  __export: foo(id: $__variable_1) {
    baz
    child {
      child {
        __variable_2: id
      }
      __variable_3: id
    }
  }
}
        `.trim(),
          resolverDependencyFieldMap: {
            child: [
              {
                subgraph: 'B',
                resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_3: ID!) {
  __export: foo(id: $__variable_3) {
    bar
  }
}`.trim(),
              },
            ],
            'child.child': [
              {
                subgraph: 'B',
                resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_2: ID!) {
  __export: foo(id: $__variable_2) {
    bar
  }
}`.trim(),
              },
            ],
          },
        },
      ]);
    });
    it('resolves a field on root level', () => {
      const operationInText = /* GraphQL */ `
        query Test {
          myFoo {
            bar
          }
        }
      `;

      const operationDoc = parse(operationInText, { noLocation: true });

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selectionSet = operationAst!.selectionSet as FlattenedSelectionSet;

      const fakeFieldNode: FlattenedFieldNode = {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__fake',
        },
        selectionSet,
      };

      const supergraph = buildSchema(
        /* GraphQL */ `
          type Query {
            myFoo: Foo! @resolver(operation: "query MyFooFromA { myFoo }", subgraph: "A")
          }

          type Foo @source(subgraph: "A") {
            bar: String! @source(subgraph: "A")
          }
        `,
        {
          assumeValid: true,
          assumeValidSDL: true,
        },
      );

      const { newFieldNode, resolverOperationNodes, resolverDependencyFieldMap } =
        visitFieldNodeForTypeResolvers(
          'DUMMY',
          fakeFieldNode,
          supergraph.getQueryType()!,
          supergraph,
          { currentVariableIndex: 0 },
        );

      expect(print(newFieldNode)).toBe(`__fake`);

      expect(resolverOperationNodes.map(serializeResolverOperationNode)).toStrictEqual([]);

      const resolverDependencyMapEntries = [...resolverDependencyFieldMap];
      expect(
        Object.fromEntries(
          resolverDependencyMapEntries.map(([key, value]) => [
            key,
            value.map(serializeResolverOperationNode),
          ]),
        ),
      ).toStrictEqual({
        myFoo: [
          {
            resolverOperationDocument: /* GraphQL */ `
query MyFooFromA {
  __export: myFoo {
    bar
  }
}`.trim(),
            subgraph: 'A',
          },
        ],
      });
    });
  });
});

describe('Execution', () => {
  const aSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        myFoo: Foo!
        foos: [Foo!]!
      }

      type Foo {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        myFoo: () => ({
          id: 'A_FOO_ID',
        }),
        foos: () => [
          {
            id: 'A_FOO_ID_0',
          },
          {
            id: 'A_FOO_ID_1',
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
        bar: String!
      }
    `,
    resolvers: {
      Query: {
        foo: (_, { id }) => ({
          id,
        }),
      },
      Foo: {
        bar: ({ id }) => `B_BAR_FOR_${id}`,
      },
    },
  });

  const cSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        foo(id: ID!): Foo!
      }

      type Foo {
        id: ID!
        baz: String!
        child: Foo
        children: [Foo!]!
      }
    `,
    resolvers: {
      Query: {
        foo: (_, { id }) => ({ id }),
      },
      Foo: {
        child: ({ id }) => ({
          id: `C_CHILD_ID_FOR_${id}`,
        }),
        baz: ({ id }) => `C_BAZ_FOR_${id}`,
        children: ({ id }) => [
          {
            id: `C_CHILD_ID_0_FOR_${id}`,
          },
          {
            id: `C_CHILD_ID_1_FOR_${id}`,
          },
        ],
      },
    },
  });

  const dSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Foo {
        id: ID!
        qux: String!
      }

      type Query {
        foos(ids: [ID!]!): [Foo!]!
      }
    `,
    resolvers: {
      Query: {
        foos: (_, { ids }) => {
          return ids.map((id: any) => ({
            id,
          }));
        },
      },
      Foo: {
        qux: ({ id }) => `D_QUX_FOR_${id}`,
      },
    },
  });

  const supergraphInText = /* GraphQL */ `
    type Foo
      @variable(name: "Foo_id", select: "id", subgraph: "A")
      @variable(name: "Foo_id", select: "id", subgraph: "B")
      @variable(name: "Foo_id", select: "id", subgraph: "C")
      @resolver(operation: "query FooFromB($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "B")
      @resolver(operation: "query FooFromC($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "C")
      @resolver(
        operation: "query FooFromD($Foo_id: [ID!]!) { foos(ids: $Foo_id) }"
        subgraph: "D"
        kind: BATCH
      ) {
      id: ID! @source(subgraph: "A") @source(subgraph: "B") @source(subgraph: "C")
      bar: String! @source(subgraph: "B")
      baz: String! @source(subgraph: "C")
      child: Foo @source(subgraph: "C")
      children: [Foo!]! @source(subgraph: "C")
      qux: String! @source(subgraph: "D")
    }

    type Query {
      myFoo: Foo! @resolver(operation: "query MyFooFromA { myFoo }", subgraph: "A")
      foos: [Foo!]! @resolver(operation: "query FoosFromA { foos }", subgraph: "A")
    }
  `;

  const supergraph = buildSchema(supergraphInText, {
    assumeValid: true,
    assumeValidSDL: true,
  });

  const rootType = supergraph.getType('Query') as GraphQLObjectType;

  const executorMap = new Map();

  executorMap.set('A', createDefaultExecutor(aSchema));
  executorMap.set('B', createDefaultExecutor(bSchema));
  executorMap.set('C', createDefaultExecutor(cSchema));
  executorMap.set('D', createDefaultExecutor(dSchema));

  it('works', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          bar
          baz
          child {
            bar
            child {
              bar
            }
          }
        }
      }
    `;
    const operationDoc = parse(operationInText, { noLocation: true });

    const operationAst = getOperationAST(operationDoc, 'Test');

    const fakeFieldNode: FlattenedFieldNode = {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: '__fake',
      },
      selectionSet: operationAst!.selectionSet as FlattenedSelectionSet,
    };

    const plan = visitFieldNodeForTypeResolvers('ROOT', fakeFieldNode, rootType, supergraph, {
      currentVariableIndex: 0,
    });

    const executablePlan = createExecutableResolverOperationNodesWithDependencyMap(
      plan.resolverOperationNodes,
      plan.resolverDependencyFieldMap,
    );
    const result = await executeResolverOperationNodesWithDependenciesInParallel(
      executablePlan.newResolverOperationNodes,
      executablePlan.newResolverDependencyMap,
      new Map(),
      executorMap,
    );

    expect(result.exported).toMatchObject({
      myFoo: {
        bar: 'B_BAR_FOR_A_FOO_ID',
        baz: 'C_BAZ_FOR_A_FOO_ID',
        child: {
          bar: 'B_BAR_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          child: {
            bar: 'B_BAR_FOR_C_CHILD_ID_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          },
        },
      },
    });
  });
  it('works with lists', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foos {
          bar
          baz
        }
      }
    `;
    const operationDoc = parse(operationInText, { noLocation: true });

    const operationAst = getOperationAST(operationDoc, 'Test');

    const fakeFieldNode: FlattenedFieldNode = {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: '__fake',
      },
      selectionSet: operationAst!.selectionSet as FlattenedSelectionSet,
    };

    const plan = visitFieldNodeForTypeResolvers('ROOT', fakeFieldNode, rootType, supergraph, {
      currentVariableIndex: 0,
    });

    const executablePlan = createExecutableResolverOperationNodesWithDependencyMap(
      plan.resolverOperationNodes,
      plan.resolverDependencyFieldMap,
    );

    const result = await executeResolverOperationNodesWithDependenciesInParallel(
      executablePlan.newResolverOperationNodes,
      executablePlan.newResolverDependencyMap,
      new Map(),
      executorMap,
    );

    expect(result.exported).toMatchObject({
      foos: [
        {
          bar: 'B_BAR_FOR_A_FOO_ID_0',
          baz: 'C_BAZ_FOR_A_FOO_ID_0',
        },
        {
          bar: 'B_BAR_FOR_A_FOO_ID_1',
          baz: 'C_BAZ_FOR_A_FOO_ID_1',
        },
      ],
    });
  });
  it('works with nested lists', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foos {
          bar
          baz
          children {
            bar
            baz
            children {
              bar
              baz
            }
          }
        }
      }
    `;
    const operationDoc = parse(operationInText, { noLocation: true });

    const operationAst = getOperationAST(operationDoc, 'Test');

    const fakeFieldNode: FlattenedFieldNode = {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: '__fake',
      },
      selectionSet: operationAst!.selectionSet as FlattenedSelectionSet,
    };

    const plan = visitFieldNodeForTypeResolvers('ROOT', fakeFieldNode, rootType, supergraph, {
      currentVariableIndex: 0,
    });

    const executablePlan = createExecutableResolverOperationNodesWithDependencyMap(
      plan.resolverOperationNodes,
      plan.resolverDependencyFieldMap,
    );

    const result = await executeResolverOperationNodesWithDependenciesInParallel(
      executablePlan.newResolverOperationNodes,
      executablePlan.newResolverDependencyMap,
      new Map(),
      executorMap,
    );

    expect(result.exported).toMatchObject({
      foos: [
        {
          bar: 'B_BAR_FOR_A_FOO_ID_0',
          baz: 'C_BAZ_FOR_A_FOO_ID_0',
          children: [
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
              baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                },
              ],
            },
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
              baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                },
              ],
            },
          ],
        },
        {
          bar: 'B_BAR_FOR_A_FOO_ID_1',
          baz: 'C_BAZ_FOR_A_FOO_ID_1',
          children: [
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
              baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                },
              ],
            },
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
              baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                },
              ],
            },
          ],
        },
      ],
    });
  });
  it('works with lists & batching', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foos {
          qux
        }
      }
    `;
    const operationDoc = parse(operationInText, { noLocation: true });

    const operationAst = getOperationAST(operationDoc, 'Test');

    const fakeFieldNode: FlattenedFieldNode = {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: '__fake',
      },
      selectionSet: operationAst!.selectionSet as FlattenedSelectionSet,
    };

    const plan = visitFieldNodeForTypeResolvers('ROOT', fakeFieldNode, rootType, supergraph, {
      currentVariableIndex: 0,
    });

    const executablePlan = createExecutableResolverOperationNodesWithDependencyMap(
      plan.resolverOperationNodes,
      plan.resolverDependencyFieldMap,
    );

    const result = await executeResolverOperationNodesWithDependenciesInParallel(
      executablePlan.newResolverOperationNodes,
      executablePlan.newResolverDependencyMap,
      new Map(),
      executorMap,
    );

    expect(result.exported).toMatchObject({
      foos: [
        {
          qux: 'D_QUX_FOR_A_FOO_ID_0',
        },
        {
          qux: 'D_QUX_FOR_A_FOO_ID_1',
        },
      ],
    });
  });
});
