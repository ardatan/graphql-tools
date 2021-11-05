import { handleEventStreamResponse } from '../src/event-stream/handleEventStreamResponse';
import { TextEncoder } from 'util';

describe('handleEventStreamResponse', () => {
  describe('ReadableStream', () => {
    if (parseInt(process.versions.node.split('.')[0]) < 16) {
      it('dummy', () => { });
    }
    const { TransformStream } = require('stream/web');
    it('should handle an event with data', async () => {
      const { readable, writable } = new TransformStream();
      const encoder = new TextEncoder();
      const stream = writable.getWriter();

      const generator = await handleEventStreamResponse(readable);

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

      const readStream = async () => {
        const generator = await handleEventStreamResponse(readable);

        stream.write(encoder.encode(':\n\n'));
        stream.write(encoder.encode('event: next\n'));
        stream.write(encoder.encode('data: { "foo": "bar" }\n\n'));

        return generator.next();
      };

      await expect(await readStream()).resolves.toMatchInlineSnapshot(`
      Object {
        "done": false,
        "value": Object {
          "foo": "bar",
        },
      }
    `);
    });
  });

})
