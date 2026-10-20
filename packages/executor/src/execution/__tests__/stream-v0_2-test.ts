import {
  DocumentNode,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import { mergeIncrementalResult } from '@graphql-tools/utils';
import { expectJSON } from '../../__testUtils__/expectJSON.js';
import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from '../execute.js';
import { execute } from '../execute.js';

/**
 * Payload-format cases ported from graphql-js 17
 * `src/execution/incremental/__tests__/stream-test.ts`
 * (experimental incremental spec v0.2).
 *
 * Item batching may differ from graphql-js (one payload vs several); tests
 * assert pending/id/completed and the reconstructed list.
 */

const query = new GraphQLObjectType({
  fields: {
    scalarList: {
      type: new GraphQLList(GraphQLString),
    },
  },
  name: 'Query',
});

const schema = new GraphQLSchema({ query });

async function complete(document: DocumentNode, rootValue: unknown = {}) {
  const result = await execute({
    schema,
    document,
    rootValue,
    incrementalSpec: 'v0.2',
  });

  if ('initialResult' in result) {
    const results: Array<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult> =
      [result.initialResult];
    for await (const patch of result.subsequentResults) {
      results.push(patch);
    }
    return results;
  }
  return result;
}

function collectStreamItems(
  payloads: Array<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult>,
  id: string,
): Array<unknown> {
  const items: Array<unknown> = [];
  for (const payload of payloads) {
    for (const patch of payload.incremental ?? []) {
      if (patch.id === id && 'items' in patch && Array.isArray(patch.items)) {
        items.push(...patch.items);
      }
    }
  }
  return items;
}

describe('Execute: stream directive (incremental spec v0.2)', () => {
  it('Can stream a list field', async () => {
    const document = parse('{ scalarList @stream(initialCount: 1) }');
    const result = await complete(document, {
      scalarList: () => ['apple', 'banana', 'coconut'],
    });

    expect(Array.isArray(result)).toBe(true);
    const payloads = result as Array<
      InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult
    >;
    expectJSON(payloads[0]).toDeepEqual({
      data: {
        scalarList: ['apple'],
      },
      pending: [{ id: '0', path: ['scalarList'] }],
      hasNext: true,
    });
    expect(collectStreamItems(payloads, '0')).toEqual(['banana', 'coconut']);
    expectJSON(payloads[payloads.length - 1]).toDeepEqual({
      completed: [{ id: '0' }],
      hasNext: false,
    });
  });

  it('Can use default value of initialCount', async () => {
    const document = parse('{ scalarList @stream }');
    const result = await complete(document, {
      scalarList: () => ['apple', 'banana', 'coconut'],
    });

    const payloads = result as Array<
      InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult
    >;
    expectJSON(payloads[0]).toDeepEqual({
      data: {
        scalarList: [],
      },
      pending: [{ id: '0', path: ['scalarList'] }],
      hasNext: true,
    });
    expect(collectStreamItems(payloads, '0')).toEqual(['apple', 'banana', 'coconut']);
    expectJSON(payloads[payloads.length - 1]).toDeepEqual({
      completed: [{ id: '0' }],
      hasNext: false,
    });
  });

  it('Returns label from stream directive', async () => {
    const document = parse('{ scalarList @stream(initialCount: 1, label: "scalar-stream") }');
    const result = await complete(document, {
      scalarList: () => ['apple', 'banana', 'coconut'],
    });
    const payloads = result as Array<
      InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult
    >;
    expectJSON(payloads[0]).toDeepEqual({
      data: {
        scalarList: ['apple'],
      },
      pending: [{ id: '0', path: ['scalarList'], label: 'scalar-stream' }],
      hasNext: true,
    });
    expect(collectStreamItems(payloads, '0')).toEqual(['banana', 'coconut']);
  });

  it('Treats null stream label the same as no label', async () => {
    const document = parse('{ scalarList @stream(initialCount: 1, label: null) }');
    const result = await complete(document, {
      scalarList: () => ['apple', 'banana', 'coconut'],
    });
    const payloads = result as Array<
      InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult
    >;
    expectJSON(payloads[0]).toDeepEqual({
      data: {
        scalarList: ['apple'],
      },
      pending: [{ id: '0', path: ['scalarList'] }],
      hasNext: true,
    });
  });

  it('Can disable @stream using if argument', async () => {
    const document = parse('{ scalarList @stream(if: false) }');
    const result = await complete(document, {
      scalarList: () => ['apple', 'banana', 'coconut'],
    });
    expectJSON(result).toDeepEqual({
      data: {
        scalarList: ['apple', 'banana', 'coconut'],
      },
    });
  });

  it('reconstructs the full list when v0.2 payloads are merged', async () => {
    const document = parse('{ scalarList @stream(initialCount: 1) }');
    const payloads = (await complete(document, {
      scalarList: () => ['apple', 'banana', 'coconut'],
    })) as Array<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult>;

    const initial = payloads[0];
    const executionResult = {
      data: 'data' in initial ? initial.data : undefined,
    };
    mergeIncrementalResult({
      incrementalResult: { pending: initial.pending },
      executionResult,
    });
    for (const payload of payloads.slice(1)) {
      mergeIncrementalResult({ incrementalResult: payload, executionResult });
    }
    expect(executionResult.data).toEqual({
      scalarList: ['apple', 'banana', 'coconut'],
    });
  });

  it('completes the stream when the async iterable throws after initialCount', async () => {
    const document = parse('{ scalarList @stream(initialCount: 1) }');
    const result = await complete(document, {
      async *scalarList() {
        yield 'apple';
        throw new Error('bad');
      },
    });

    const payloads = result as Array<
      InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult
    >;
    expectJSON(payloads[0]).toDeepEqual({
      data: {
        scalarList: ['apple'],
      },
      pending: [{ id: '0', path: ['scalarList'] }],
      hasNext: true,
    });

    const completedIds = payloads
      .flatMap(payload => payload.completed ?? [])
      .map(entry => entry.id);
    expect(completedIds).toEqual(['0']);
    expect(collectStreamItems(payloads, '0')).toEqual([null]);
    expect(payloads[payloads.length - 1].hasNext).toBe(false);

    const streamErrors = payloads.flatMap(
      payload => payload.incremental?.flatMap(patch => patch.errors ?? []) ?? [],
    );
    expect(streamErrors).toEqual([
      expect.objectContaining({
        message: 'bad',
        path: ['scalarList', 1],
      }),
    ]);
  });
});
