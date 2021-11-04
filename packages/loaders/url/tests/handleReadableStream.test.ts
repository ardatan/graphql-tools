import { handleReadableStream } from '../src/event-stream/handleReadableStream';
import { TransformStream } from 'web-streams-polyfill/ponyfill';
import { TextEncoder } from 'util';

describe('handleReadableStream', () => {
  it('should handle an event with data', async () => {
    const { readable, writable } = new TransformStream();
    const encoder = new TextEncoder();
    const stream = writable.getWriter();

    const generator = handleReadableStream(readable as any);

    // stream.write(encoder.encode(':\n\n'));
    stream.write(encoder.encode('event: complete\n'));
    stream.write(encoder.encode('data: { "foo": "bar" }\n'));
    stream.write(encoder.encode('\n'));

    expect((await generator.next()).value).toMatchInlineSnapshot(`
          Object {
            "foo": "bar",
          }
      `);
  });

  it('should ignore server pings', async () => {
    const { readable, writable } = new TransformStream();
    const encoder = new TextEncoder();
    const stream = writable.getWriter();

    const readStream = () => {
      const generator = handleReadableStream(readable as any);

      stream.write(encoder.encode(':\n\n'));
      stream.write(encoder.encode('event: next\n'));
      stream.write(encoder.encode('data: { "foo": "bar" }\n\n'));

      return generator.next();
    };

    await expect(readStream()).resolves.toMatchInlineSnapshot(`
      Object {
        "done": false,
        "value": Object {
          "foo": "bar",
        },
      }
    `);
  });
});
