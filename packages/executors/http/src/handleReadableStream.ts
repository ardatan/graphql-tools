import { TextDecoder } from '@whatwg-node/fetch';
import { Repeater } from '@repeaterjs/repeater';
import { ExecutionResult } from '@graphql-tools/utils';

export function handleReadableStream(readableStream: ReadableStream<Uint8Array>) {
  const textDecoder = new TextDecoder();
  return new Repeater<ExecutionResult>(function repeaterExecutor(push, stop) {
    const reader = readableStream.getReader();
    async function pump(): Promise<any> {
      const { done, value } = await reader.read();
      if (done) {
        return stop();
      }
      if (value) {
        const chunk = typeof value === 'string' ? value : textDecoder.decode(value, { stream: true });
        for (const part of chunk.split('\n\n')) {
          if (part) {
            const eventStr = part.split('event: ')[1];
            const dataStr = part.split('data: ')[1];
            if (eventStr === 'complete') {
              return stop();
            }
            if (dataStr) {
              const data = JSON.parse(dataStr);
              await push(data.payload || data);
            }
          }
        }
      }
      return pump();
    }
    stop.finally(() => reader.cancel());
    return pump();
  });
}
