import {
  buildSchema,
  DocumentNode,
  getOperationAST,
  GraphQLObjectType,
  Kind,
  parse,
  print,
} from 'graphql';
import {
  createResolveNode,
  ResolverOperationNode,
  visitFieldNodeForTypeResolvers,
} from '../src/2nd-take.js';
import { FlattenedFieldNode, FlattenedSelectionSet } from '../src/flattenSelections.js';

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
    );

    expect(print(newFieldNode)).toBe('myFoo {\n  baz\n  __variable_Foo_id: id\n}');
    expect(print(resolverOperationDocument)).toBe(
      /* GraphQL */ `
query FooFromB($Foo_id: ID!) {
  __export: foo(id: $Foo_id) {
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
    );

    expect(print(newFieldNode)).toBe(
      /* GraphQL */ `
myFoo {
  extraField {
    baz
  }
  __variable_Foo_id: id
}
`.trim(),
    );

    expect(print(resolverOperationDocument)).toBe(
      /* GraphQL */ `
query ExtraFieldFromC($Foo_id: ID!) {
  __export: extraFieldForFoo(id: $Foo_id) {
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
    );

    expect(print(newFieldNode)).toBe(
      'myFoo {\n  __variable_Foo_id: id\n  __variable_Foo_id: id\n}',
    );

    expect(resolverOperationNodes.map(serializeNode)).toStrictEqual([
      {
        subgraph: 'B',
        resolverOperationDocument: /* GraphQL */ `
query FooFromB($Foo_id: ID!) {
  __export: foo(id: $Foo_id) {
    bar
  }
}
        `.trim(),
      },
      {
        subgraph: 'C',
        resolverOperationDocument: /* GraphQL */ `
query FooFromC($Foo_id: ID!) {
  __export: foo(id: $Foo_id) {
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
    );
    /*
    for (const node of resolverOperationNodes) {
      console.log(inspect(serializeNode(node), undefined, Infinity))
    }
*/
    expect(print(newFieldNode)).toBe(
      'myFoo {\n  __variable_Foo_id: id\n  __variable_Foo_id: id\n}',
    );

    expect(resolverOperationNodes.map(serializeNode)).toStrictEqual([
      {
        subgraph: 'B',
        resolverOperationDocument: /* GraphQL */ `
query FooFromB($Foo_id: ID!) {
  __export: foo(id: $Foo_id) {
    bar
  }
}
        `.trim(),
      },
      {
        subgraph: 'C',
        resolverOperationDocument: /* GraphQL */ `
query FooFromC($Foo_id: ID!) {
  __export: foo(id: $Foo_id) {
    baz
    child {
      child {
        __variable_Foo_id: id
      }
      __variable_Foo_id: id
    }
  }
}
        `.trim(),
        resolverDependencyMap: {
          child: [
            {
              subgraph: 'B',
              resolverOperationDocument: /* GraphQL */ `
query FooFromB($Foo_id: ID!) {
  __export: foo(id: $Foo_id) {
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

    const { newFieldNode, resolverOperationNodes, resolverDependencyMap } =
      visitFieldNodeForTypeResolvers(
        'DUMMY',
        fakeFieldNode,
        supergraph.getQueryType()!,
        supergraph,
      );

    expect(print(newFieldNode)).toBe(`__fake`);

    expect(resolverOperationNodes.map(serializeNode)).toStrictEqual([]);

    const resolverDependencyMapEntries = [...resolverDependencyMap];
    expect(
      Object.fromEntries(
        resolverDependencyMapEntries.map(([key, value]) => [key, value.map(serializeNode)]),
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

function serializeNode(node: {
  subgraph: string;
  resolverOperationDocument: DocumentNode;
  resolverDependencyMap: Map<string, ResolverOperationNode[]>;
}): any {
  const resolverDependencyMapEntries = [...node.resolverDependencyMap];
  return {
    subgraph: node.subgraph,
    resolverOperationDocument: print(node.resolverOperationDocument),
    ...(resolverDependencyMapEntries.length
      ? {
          resolverDependencyMap: Object.fromEntries(
            resolverDependencyMapEntries.map(([key, value]) => [key, value.map(serializeNode)]),
          ),
        }
      : {}),
  };
}
