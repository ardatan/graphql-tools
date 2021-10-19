/* eslint-disable no-labels */
import type { Readable } from 'stream';
import { handlePart } from './handlePart';

export async function* handleReadable(readable: Readable) {
  outer: for await (const chunk of readable) {
    const chunkStr = chunk.toString();
    for (const part of chunkStr.split('\n\n')) {
      if (part) {
        const result = handlePart(part);
        if (result === false) {
          break outer;
        }
        yield result;
      }
    }
  }
}
