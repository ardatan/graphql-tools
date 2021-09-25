import {
  graphql,
  parse,
  print,
  OperationDefinitionNode,
  ExecutionResult
} from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createBatchingExecutor } from '@graphql-tools/batch-execute';
import { Executor } from '@graphql-tools/utils';

describe('batch execution', () => {
  let executorCalls: number = 0;
  let executorDocument: string | undefined;

  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */`
      type Query {
        field1: String
        field2: String
        field3(input: String): String
        boom(message: String): String
      }
    `,
    resolvers: {
      Query: {
        field1: () => '1',
        field2: () => '2',
        field3: (_root, { input }) => String(input),
        boom: (_root, { message }) => new Error(message),
      },
    },
  });

  const exec = (({ document }) => {
    executorCalls += 1;
    executorDocument = print(document);
    return graphql({
      schema,
      source: executorDocument,
    });
  }) as Executor;

  const batchExec = createBatchingExecutor(exec);

  beforeEach(() => {
    executorCalls = 0;
    executorDocument = undefined;
  });

  function getRequestFields(): Array<string> {
    if (executorDocument != null) {
      const op = parse(executorDocument).definitions[0] as OperationDefinitionNode;
      const names = op.selectionSet.selections.map(sel => 'name' in sel ? sel.name.value : undefined);
      return names.filter(Boolean) as Array<string>;
    }
    return [];
  }

  it('batchs multiple executions', async () => {
    const [first, second] = await Promise.all([
      batchExec({ document: parse('{ field1 field2 }') }),
      batchExec({ document: parse('{ field2 field3(input: "3") }') }),
    ]) as ExecutionResult[];

    expect(first?.data).toEqual({ field1: '1', field2: '2' });
    expect(second?.data).toEqual({ field2: '2', field3: '3' });
    expect(executorCalls).toEqual(1);
    expect(getRequestFields()).toEqual(['field1', 'field2', 'field2', 'field3']);
  });

  it('preserves root field aliases in the final result', async () => {
    const [first, second] = await Promise.all([
      batchExec({ document: parse('{ a: field1 b: field2 }') }),
      batchExec({ document: parse('{ c: field2 d: field3(input: "3") }') }),
    ]) as ExecutionResult[];

    expect(first?.data).toEqual({ a: '1', b: '2' });
    expect(second?.data).toEqual({ c: '2', d: '3' });
    expect(executorCalls).toEqual(1);
    expect(getRequestFields()).toEqual(['field1', 'field2', 'field2', 'field3']);
  });

  it('preserves pathed errors in the final result', async () => {
    const [first, second] = await Promise.all([
      batchExec({ document: parse('{ first: boom(message: "first error") }') }),
      batchExec({ document: parse('{ second: boom(message: "second error") }') }),
    ]) as ExecutionResult[];

    expect(first?.errors?.[0].message).toEqual('first error');
    expect(first?.errors?.[0].path).toEqual(['first']);
    expect(second?.errors?.[0].message).toEqual('second error');
    expect(second?.errors?.[0].path).toEqual(['second']);
    expect(executorCalls).toEqual(1);
  });

  it('returns request-level errors to all results', async () => {
    const [first, second] = await Promise.all([
      batchExec({ document: parse('{ field1 field2 }') }),
      batchExec({ document: parse('{ notgonnawork }') }),
    ]) as ExecutionResult[];

    expect(first?.errors?.length).toEqual(1);
    expect(second?.errors?.length).toEqual(1);
    expect(first?.errors?.[0].message).toMatch(/notgonnawork/);
    expect(second?.errors?.[0].message).toMatch(/notgonnawork/);
    expect(executorCalls).toEqual(1);
  });
});
