import { buildSchema, parse, print, stripIgnoredCharacters } from 'graphql';
import { envelop } from '@envelop/core';
import { useExecutor } from '@graphql-tools/executor-envelop';
import { ExecutionRequest, ExecutionResult, Executor } from '@graphql-tools/utils';

describe('Envelop', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      hello: String
    }
  `);
  const query = /* GraphQL */ `
    query Greetings {
      hello
    }
  `;
  const document = parse(query);
  it('should pass the operation correctly with execute', async () => {
    const executor: Executor = jest.fn().mockImplementation(() => ({
      data: {
        hello: 'Hello World!',
      },
    }));
    const getEnveloped = envelop({
      plugins: [useExecutor(executor)],
    });
    const context = {};
    const { execute } = getEnveloped(context);
    const result = await execute({
      schema,
      document,
    });
    expect(result).toEqual({
      data: {
        hello: 'Hello World!',
      },
    });
    expect(executor).toHaveBeenCalledWith({
      document,
      context,
    });
  });
  it('should pass the operation correctly with subscribe', async () => {
    const executor = jest.fn(async function* (
      _req: ExecutionRequest,
    ): AsyncIterable<ExecutionResult> {
      for (let i = 0; i < 3; i++) {
        yield {
          data: {
            count: i,
          },
        };
      }
    });
    const getEnveloped = envelop({
      plugins: [useExecutor(executor)],
    });
    const context = {};
    const { subscribe } = getEnveloped(context);
    const result = await subscribe({
      schema,
      document,
      contextValue: context,
    });
    expect(result[Symbol.asyncIterator]).toBeDefined();
    const collectedResults: any[] = [];
    for await (const chunk of result as AsyncIterableIterator<any>) {
      collectedResults.push(chunk);
    }
    expect(collectedResults).toEqual([
      {
        data: {
          count: 0,
        },
      },
      {
        data: {
          count: 1,
        },
      },
      {
        data: {
          count: 2,
        },
      },
    ]);
    expect(stripIgnoredCharacters(print(executor.mock.calls[1][0].document))).toBe(
      stripIgnoredCharacters(query),
    );
    expect(executor.mock.calls[1][0].context).toBe(context);
  });
  it('should skip validation if schema is not provided', async () => {
    const executor: Executor = jest.fn().mockImplementation(() => {
      return {
        data: {
          hello: 'Hello World!',
        },
      };
    });
    const getEnveloped = envelop({
      plugins: [useExecutor(executor)],
    });
    const context = {};
    const { validate, execute } = getEnveloped(context);
    const validationResult = validate({}, document);
    expect(validationResult).toHaveLength(0);
    const result = await execute({
      schema: {},
      document,
    });
    expect(result).toEqual({
      data: {
        hello: 'Hello World!',
      },
    });
    expect(executor).toHaveBeenCalledWith({
      document,
      context,
    });
  });
});
