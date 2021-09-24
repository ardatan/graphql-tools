import { graphql, parse, print } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createBatchingExecutor } from '@graphql-tools/batch-execute';
import { Executor } from '@graphql-tools/utils';

describe('batch execution', () => {
  let executorCalls: number = 0;
  let executorDocument: string;

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

  const exec: Executor = ({ document, variables }) => {
    executorCalls += 1;
    executorDocument = print(document);
    return graphql({
      schema,
      source: executorDocument,
      variables
    });
  };

  const batchExec = createBatchingExecutor(exec);

  beforeEach(() => {
    executorCalls = 0;
    executorDocument = undefined;
  });

  function getRequestFields() {
    return parse(executorDocument).definitions[0]
      .selectionSet.selections.map(sel => sel.name.value);
  }

  it('batchs multiple executions', async () => {
    const results = await Promise.all([
      batchExec({ document: parse('{ field1 field2 }') }),
      batchExec({ document: parse('{ field2 field3(input: "3") }') }),
    ]);

    expect(results[0].data).toEqual({ field1: '1', field2: '2' });
    expect(results[1].data).toEqual({ field2: '2', field3: '3' });
    expect(executorCalls).toEqual(1);
    expect(getRequestFields()).toEqual(['field1', 'field2', 'field2', 'field3']);
  });

  it('preserves root field aliases in the final result', async () => {
    const results = await Promise.all([
      batchExec({ document: parse('{ a: field1 b: field2 }') }),
      batchExec({ document: parse('{ c: field2 d: field3(input: "3") }') }),
    ]);

    expect(results[0].data).toEqual({ a: '1', b: '2' });
    expect(results[1].data).toEqual({ c: '2', d: '3' });
    expect(executorCalls).toEqual(1);
    expect(getRequestFields()).toEqual(['field1', 'field2', 'field2', 'field3']);
  });

  it('preserves pathed errors in the final result', async () => {
    const results = await Promise.all([
      batchExec({ document: parse('{ first: boom(message: "first error") }') }),
      batchExec({ document: parse('{ second: boom(message: "second error") }') }),
    ]);

    expect(results[0].errors[0].message).toEqual('first error');
    expect(results[0].errors[0].path).toEqual(['first']);
    expect(results[1].errors[0].message).toEqual('second error');
    expect(results[1].errors[0].path).toEqual(['second']);
    expect(executorCalls).toEqual(1);
  });

  it('returns request-level errors to all results', async () => {
    const results = await Promise.all([
      batchExec({ document: parse('{ field1 field2 }') }),
      batchExec({ document: parse('{ notgonnawork }') }),
    ]);

    expect(results[0].errors.length).toEqual(1);
    expect(results[1].errors.length).toEqual(1);
    expect(results[0].errors[0].message).toMatch(/notgonnawork/);
    expect(results[1].errors[0].message).toMatch(/notgonnawork/);
    expect(executorCalls).toEqual(1);
  });
});
