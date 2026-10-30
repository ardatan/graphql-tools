import {
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  parse,
  type FieldNode,
} from 'graphql';
import {
  buildExecutionContext,
  collectFieldsFromContext,
  collectSubfieldsFromContext,
  executeSync,
  type ExecutionContext,
} from '../execute.js';

const itemType = new GraphQLObjectType({
  name: 'Item',
  fields: {
    name: { type: GraphQLString },
    skipped: { type: GraphQLString },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      items: {
        type: new GraphQLList(itemType),
        resolve: () => [
          { name: 'a', skipped: 'x' },
          { name: 'b', skipped: 'y' },
        ],
      },
      a: { type: GraphQLString, resolve: () => 'a' },
      b: { type: GraphQLString, resolve: () => 'b' },
    },
  }),
});

function assertExeContext(
  value: ReadonlyArray<unknown> | ExecutionContext,
): asserts value is ExecutionContext {
  expect('schema' in value).toBe(true);
}

describe('collectFields stable cache', () => {
  it('marks documents without variable conditionals as stable', () => {
    const document = parse('query ($unused: String) { a b }');
    const exeContext = buildExecutionContext({
      schema,
      document,
      variableValues: { unused: 'one' },
    });
    assertExeContext(exeContext);
    expect(exeContext.collectFieldsDependsOnVariables).toBe(false);
  });

  it('marks documents with @skip(if: $var) as variable-dependent', () => {
    const document = parse('query ($s: Boolean!) { a b @skip(if: $s) }');
    const exeContext = buildExecutionContext({
      schema,
      document,
      variableValues: { s: true },
    });
    assertExeContext(exeContext);
    expect(exeContext.collectFieldsDependsOnVariables).toBe(true);
  });

  it('reuses collectFields results across executions when variables are unused by directives', () => {
    const document = parse('query ($unused: String) { items { name } }');
    const first = buildExecutionContext({
      schema,
      document,
      variableValues: { unused: 'one' },
    });
    const second = buildExecutionContext({
      schema,
      document,
      variableValues: { unused: 'two' },
    });
    assertExeContext(first);
    assertExeContext(second);

    const rootType = schema.getQueryType()!;
    const collectedFirst = collectFieldsFromContext(first, rootType, first.operation.selectionSet);
    const collectedSecond = collectFieldsFromContext(
      second,
      rootType,
      second.operation.selectionSet,
    );

    expect(collectedSecond).toBe(collectedFirst);

    const itemsFieldNodes = collectedFirst.fields.get('items')!;
    const subFirst = collectSubfieldsFromContext(first, itemType, itemsFieldNodes);
    const subSecond = collectSubfieldsFromContext(second, itemType, itemsFieldNodes);
    expect(subSecond).toBe(subFirst);
  });

  it('does not reuse collectFields results when @skip depends on variables', () => {
    const document = parse('query ($s: Boolean!) { a b @skip(if: $s) }');
    const skipped = buildExecutionContext({
      schema,
      document,
      variableValues: { s: true },
    });
    const included = buildExecutionContext({
      schema,
      document,
      variableValues: { s: false },
    });
    assertExeContext(skipped);
    assertExeContext(included);

    const rootType = schema.getQueryType()!;
    const collectedSkipped = collectFieldsFromContext(
      skipped,
      rootType,
      skipped.operation.selectionSet,
    );
    const collectedIncluded = collectFieldsFromContext(
      included,
      rootType,
      included.operation.selectionSet,
    );

    expect(collectedIncluded).not.toBe(collectedSkipped);
    expect([...collectedSkipped.fields.keys()]).toEqual(['a']);
    expect([...collectedIncluded.fields.keys()]).toEqual(['a', 'b']);
  });

  it('still executes correctly with variable @include across list items', () => {
    const document = parse(`
      query ($show: Boolean!) {
        items {
          name
          skipped @include(if: $show)
        }
      }
    `);

    expect(
      executeSync({
        schema,
        document,
        variableValues: { show: false },
      }),
    ).toEqual({
      data: {
        items: [{ name: 'a' }, { name: 'b' }],
      },
    });

    expect(
      executeSync({
        schema,
        document,
        variableValues: { show: true },
      }),
    ).toEqual({
      data: {
        items: [
          { name: 'a', skipped: 'x' },
          { name: 'b', skipped: 'y' },
        ],
      },
    });
  });

  it('reuses the same fieldNodes array identity for list completion when stable', () => {
    const document = parse('{ items { name } }');
    const exeContext = buildExecutionContext({ schema, document });
    assertExeContext(exeContext);

    const rootType = schema.getQueryType()!;
    const { fields } = collectFieldsFromContext(
      exeContext,
      rootType,
      exeContext.operation.selectionSet,
    );
    const itemsFieldNodes = fields.get('items')!;
    expect(itemsFieldNodes[0].kind).toBe(Kind.FIELD);

    const first = collectSubfieldsFromContext(exeContext, itemType, itemsFieldNodes);
    const second = collectSubfieldsFromContext(exeContext, itemType, itemsFieldNodes);
    expect(second).toBe(first);

    // A freshly allocated fieldNodes array is a different cache key.
    const clone: Array<FieldNode> = [...itemsFieldNodes];
    const third = collectSubfieldsFromContext(exeContext, itemType, clone);
    expect(third).not.toBe(first);
    expect([...third.fields.keys()]).toEqual([...first.fields.keys()]);
  });
});
