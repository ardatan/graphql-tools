/* eslint-disable no-labels */
import { handlePart } from './handlePart';

export async function* handleReadableStream(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const reader = stream.getReader();

  try {
    let result: ReadableStreamDefaultReadResult<Uint8Array>;
    outer: while (!(result = await reader.read()).done) {
      const chunk = decoder.decode(result.value);
      for (const part of chunk.toString().split('\n\n')) {
        if (part) {
          const executionResult = handlePart(part);
          if (executionResult === false) {
            break outer;
          }
          yield result;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
