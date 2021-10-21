/* eslint-disable no-labels */
import type { Readable } from 'stream';

export async function* handleReadable(readable: Readable) {
  outer: for await (const chunk of readable) {
    const chunkStr = chunk.toString();
    for (const part of chunkStr.split('\n\n')) {
      if (part) {
        const eventStr = part.split('event: ')[1];
        const dataStr = part.split('data: ')[1];
        const data = JSON.parse(dataStr);
        if (eventStr === 'complete') {
          break outer;
        }
        yield data.payload || data;
      }
    }
  }
}
