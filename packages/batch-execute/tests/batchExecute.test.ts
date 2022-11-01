import { parse, print, OperationDefinitionNode, validate } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createBatchingExecutor } from '@graphql-tools/batch-execute';
import { ExecutionResult, Executor } from '@graphql-tools/utils';
import { normalizedExecutor } from '@graphql-tools/executor';

describe('batch execution', () => {
  let executorCalls = 0;
  let executorDocument: string | undefined;
  let executorVariables: Record<string, any> | undefined;

  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        field1: String
        field2: String
        field3(input: String): String
        boom(message: String): String
        widget: Widget
      }
      type Widget {
        name: String
      }
    `,
    resolvers: {
      Query: {
        field1: () => '1',
        field2: () => '2',
        field3: (_root, { input }) => String(input),
        boom: (_root, { message }) => new Error(message),
        widget: () => ({ name: 'wingnut' }),
      },
    },
  });

  const exec: Executor = async ({ document, variables }) => {
    executorCalls += 1;
    executorDocument = print(document);
    executorVariables = variables;
    const errors = validate(schema, document);
    if (errors.length > 0) {
      return { errors };
    }
    return normalizedExecutor({
      schema,
      document,
      variableValues: executorVariables,
    });
  };

  const batchExec = createBatchingExecutor(exec);

  beforeEach(() => {
    executorCalls = 0;
    executorDocument = undefined;
    executorVariables = undefined;
  });

  function getRequestFields(): Array<string> {
    if (executorDocument != null) {
      const op = parse(executorDocument).definitions[0] as OperationDefinitionNode;
      const names = op.selectionSet.selections.map(sel => ('name' in sel ? sel.name.value : undefined));
      return names.filter(Boolean) as Array<string>;
    }
    return [];
  }

  it('batchs multiple executions', async () => {
    const [first, second] = (await Promise.all([
      batchExec({ document: parse('{ field1 field2 }') }),
      batchExec({ document: parse('{ field2 field3(input: "3") }') }),
    ])) as ExecutionResult[];

    expect(first?.data).toEqual({ field1: '1', field2: '2' });
    expect(second?.data).toEqual({ field2: '2', field3: '3' });
    expect(executorCalls).toEqual(1);
    expect(getRequestFields()).toEqual(['field1', 'field2', 'field2', 'field3']);
  });

  it('preserves root field aliases in the final result', async () => {
    const [first, second] = (await Promise.all([
      batchExec({ document: parse('{ a: field1 b: field2 }') }),
      batchExec({ document: parse('{ c: field2 d: field3(input: "3") }') }),
    ])) as ExecutionResult[];

    expect(first?.data).toEqual({ a: '1', b: '2' });
    expect(second?.data).toEqual({ c: '2', d: '3' });
    expect(executorCalls).toEqual(1);
    expect(getRequestFields()).toEqual(['field1', 'field2', 'field2', 'field3']);
  });

  it('renames input variables', async () => {
    const [first, second] = (await Promise.all([
      batchExec({
        document: parse('query($a: String){ field3(input: $a) }'),
        variables: { a: '1' },
      }),
      batchExec({
        document: parse('query($a: String){ field3(input: $a) }'),
        variables: { a: '2' },
      }),
    ])) as ExecutionResult[];

    expect(first?.data).toEqual({ field3: '1' });
    expect(second?.data).toEqual({ field3: '2' });
    expect(executorVariables).toEqual({ _0_a: '1', _1_a: '2' });
    expect(executorCalls).toEqual(1);
  });

  it('renames fields within inline spreads', async () => {
    const [first, second] = (await Promise.all([
      batchExec({ document: parse('{ ...on Query { field1 } }') }),
      batchExec({ document: parse('{ ...on Query { field2 } }') }),
    ])) as ExecutionResult[];

    const squishedDoc = executorDocument?.replace(/\s+/g, ' ');
    expect(squishedDoc).toMatch('... on Query { _0_field1: field1 }');
    expect(squishedDoc).toMatch('... on Query { _1_field2: field2 }');
    expect(first?.data).toEqual({ field1: '1' });
    expect(second?.data).toEqual({ field2: '2' });
    expect(executorCalls).toEqual(1);
  });

  it('renames fragment definitions and spreads', async () => {
    const [first, second] = (await Promise.all([
      batchExec({
        document: parse('fragment A on Widget { name } query{ widget { ...A } }'),
      }),
      batchExec({
        document: parse('fragment A on Widget { name } query{ widget { ...A } }'),
      }),
    ])) as ExecutionResult[];

    const squishedDoc = executorDocument?.replace(/\s+/g, ' ');
    expect(squishedDoc).toMatch('_0_widget: widget { ..._0_A }');
    expect(squishedDoc).toMatch('_1_widget: widget { ..._1_A }');
    expect(squishedDoc).toMatch('fragment _0_A on Widget');
    expect(squishedDoc).toMatch('fragment _1_A on Widget');
    expect(first?.data).toEqual({ widget: { name: 'wingnut' } });
    expect(second?.data).toEqual({ widget: { name: 'wingnut' } });
    expect(executorCalls).toEqual(1);
  });

  it('removes expanded root fragment definitions', async () => {
    const [first, second] = (await Promise.all([
      batchExec({
        document: parse('fragment A on Query { field1 } query{ ...A }'),
      }),
      batchExec({
        document: parse('fragment A on Query { field2 } query{ ...A }'),
      }),
    ])) as ExecutionResult[];

    expect(first?.data).toEqual({ field1: '1' });
    expect(second?.data).toEqual({ field2: '2' });
    expect(executorCalls).toEqual(1);
  });

  it('preserves pathed errors in the final result', async () => {
    const [first, second] = (await Promise.all([
      batchExec({
        document: parse('{ first: boom(message: "first error") }'),
      }),
      batchExec({
        document: parse('{ second: boom(message: "second error") }'),
      }),
    ])) as ExecutionResult[];

    expect(first?.errors?.[0].message).toEqual('first error');
    expect(first?.errors?.[0].path).toEqual(['first']);
    expect(second?.errors?.[0].message).toEqual('second error');
    expect(second?.errors?.[0].path).toEqual(['second']);
    expect(executorCalls).toEqual(1);
  });

  it('returns request-level errors to all results', async () => {
    const [first, second] = (await Promise.all([
      batchExec({ document: parse('{ field1 field2 }') }),
      batchExec({ document: parse('{ notgonnawork }') }),
    ])) as ExecutionResult[];

    expect(first?.errors?.length).toEqual(1);
    expect(second?.errors?.length).toEqual(1);
    expect(first?.errors?.[0].message).toMatch(/notgonnawork/);
    expect(second?.errors?.[0].message).toMatch(/notgonnawork/);
    expect(executorCalls).toEqual(1);
  });
});
