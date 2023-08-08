/* eslint-disable no-labels */
import { TextDecoder } from '@whatwg-node/fetch';

export async function* handleAsyncIterable(asyncIterable: AsyncIterable<Uint8Array | string>) {
  const textDecoder = new TextDecoder();
  outer: for await (const chunk of asyncIterable) {
    const chunkStr =
      typeof chunk === 'string' ? chunk : textDecoder.decode(chunk, { stream: true });
    for (const part of chunkStr.split('\n\n')) {
      if (part) {
        const eventStr = part.split('event:')[1]?.trim();
        const dataStr = part.split('data:')[1]?.trim();
        if (eventStr === 'complete') {
          break outer;
        }
        if (dataStr) {
          const data = JSON.parse(dataStr);
          yield data.payload || data;
        }
      }
    }
  }
}
