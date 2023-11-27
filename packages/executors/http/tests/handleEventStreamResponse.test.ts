import { ReadableStream, Response } from '@whatwg-node/fetch';
import { handleEventStreamResponse } from '../src/handleEventStreamResponse.js';

describe('handleEventStreamResponse', () => {
  const encoder = new TextEncoder();
  it('should handle an event with data', async () => {
    const readableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: complete\n'));
        controller.enqueue(encoder.encode('data: { "foo": "bar" }\n'));
        controller.enqueue(encoder.encode('\n'));
      },
    });

    const response = new Response(readableStream);
    const asyncIterable = handleEventStreamResponse(response);
    const iterator = asyncIterable[Symbol.asyncIterator]();
    const { value } = await iterator.next();

    expect(value).toMatchObject({
      foo: 'bar',
    });
  });

  it('should ignore server pings', async () => {
    const readableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(':\n\n'));
        controller.enqueue(encoder.encode('event: next\n'));
        controller.enqueue(encoder.encode('data: { "foo": "bar" }\n\n'));
      },
    });
    const response = new Response(readableStream);
    const asyncIterable = handleEventStreamResponse(response);
    const iterator = asyncIterable[Symbol.asyncIterator]();
    const iteratorResult = await iterator.next();

    expect(iteratorResult).toMatchObject({
      done: false,
      value: {
        foo: 'bar',
      },
    });
  });

  it('should handle an event without spaces', async () => {
    const readableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event:complete\n'));
        controller.enqueue(encoder.encode('data:{"foo":"bar"}\n'));
        controller.enqueue(encoder.encode('\n'));
      },
    });

    const response = new Response(readableStream);
    const asyncIterable = handleEventStreamResponse(response);
    const iterator = asyncIterable[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "foo": "bar",
  },
}
`);
  });

  it('should handle a chunked event with data', async () => {
    let currChunk = 0;
    const chunks = [
      'event: next\n',
      'data: { "foo":',
      '"bar" }\n\n',
      'event: next',
      '\ndata: { "foo": "baz" }\n',
      '\nevent: next\ndata: { "foo": "',
      'bay"',
      ' }\n',
      '\n',
    ];

    const readableStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const chunk = chunks[currChunk++];
        if (chunk) {
          await new Promise(resolve => setTimeout(resolve, 0)); // stream chunk after one tick
          controller.enqueue(encoder.encode(chunk));
        } else {
          controller.close();
        }
      },
    });

    const response = new Response(readableStream);
    const asyncIterable = handleEventStreamResponse(response);
    const iterator = asyncIterable[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "foo": "bar",
  },
}
`);
    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "foo": "baz",
  },
}
`);
    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
{
  "done": false,
  "value": {
    "foo": "bay",
  },
}
`);
    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
{
  "done": true,
  "value": undefined,
}
`);
  });
});
