import { handleEventStreamResponse } from '../src/event-stream/handleEventStreamResponse.js';
import { ReadableStream, Response } from 'cross-undici-fetch';

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
    const generator = await handleEventStreamResponse(response);
    const { value } = await generator.next();

    expect(value).toMatchInlineSnapshot(`
          Object {
            "foo": "bar",
          }
      `);
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
    const generator = await handleEventStreamResponse(response);
    const iteratorResult = await generator.next();

    expect(iteratorResult).toMatchInlineSnapshot(`
      Object {
        "done": false,
        "value": Object {
          "foo": "bar",
        },
      }
    `);
  });
});
