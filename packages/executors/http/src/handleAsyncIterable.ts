/* eslint-disable no-labels */
import { TextDecoder } from '@whatwg-node/fetch';

const DELIM = '\n\n';

export async function* handleAsyncIterable(asyncIterable: AsyncIterable<Uint8Array | string>) {
  const textDecoder = new TextDecoder();
  let currChunk = '';
  outer: for await (const chunk of asyncIterable) {
    currChunk += typeof chunk === 'string' ? chunk : textDecoder.decode(chunk);
    for (;;) {
      const delimIndex = currChunk.indexOf(DELIM);
      if (delimIndex === -1) {
        // incomplete message, wait for more chunks
        continue outer;
      }

      const msg = currChunk.slice(0, delimIndex); // whole message
      currChunk = currChunk.slice(delimIndex + DELIM.length); // remainder

      // data
      const dataStr = msg.split('data:')[1]?.trim();
      if (dataStr) {
        const data = JSON.parse(dataStr);
        yield data.payload || data;
      }

      // event
      const event = msg.split('event:')[1]?.trim();
      if (event === 'complete') {
        break outer;
      }
    }
  }
}
