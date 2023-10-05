/* eslint-disable no-labels */
import { TextDecoder } from '@whatwg-node/fetch';

export async function* handleAsyncIterable(asyncIterable: AsyncIterable<Uint8Array | string>) {
  const textDecoder = new TextDecoder();
  const maxChunkSize = 65000;
  let chunkTmp = '';
  outer: for await (const chunk of asyncIterable) {
    let chunkStr =
      typeof chunk === 'string' ? chunk : textDecoder.decode(chunk, { stream: true });
    if (chunk.length >= maxChunkSize) {
      chunkTmp += chunkStr;
      continue;
    }
    if (chunkTmp !== '') {
      chunkTmp += chunkStr;
      chunkStr = chunkTmp;
      chunkTmp = '';
    }
    for (const part of chunkStr.split('\n\n')) {
      if (part) {
        const eventStr = part.split('event: ')[1];
        const dataStr = part.split('data: ')[1];
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
