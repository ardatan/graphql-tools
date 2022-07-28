import { observableToAsyncIterable } from '@graphql-tools/utils';
import { TextDecoder } from '@whatwg-node/fetch';
import { ExecutionResult } from '@graphql-tools/graphql';

const textDecoder = new TextDecoder();

export function handleReadableStream(readableStream: ReadableStream<Uint8Array>) {
  return observableToAsyncIterable<ExecutionResult>({
    subscribe: observer => {
      const reader = readableStream.getReader();
      let completed = false;
      function pump() {
        return reader
          .read()
          .then(({ done, value }) => {
            if (completed) {
              return;
            }
            if (value) {
              const chunk = typeof value === 'string' ? value : textDecoder.decode(value, { stream: true });
              for (const part of chunk.split('\n\n')) {
                if (part) {
                  const eventStr = part.split('event: ')[1];
                  const dataStr = part.split('data: ')[1];
                  if (eventStr === 'complete') {
                    observer.complete();
                  }
                  if (dataStr) {
                    const data = JSON.parse(dataStr);
                    observer.next(data.payload || data);
                  }
                }
              }
            }
            if (done) {
              observer.complete();
            } else {
              pump();
            }
          })
          .catch(e => {
            // canceling a request in browsers throws an error,
            // ignore it to avoid uncaught promise exceptions
            if (!completed) throw e;
          });
      }
      pump();
      return {
        unsubscribe: () => {
          completed = true;
          reader.cancel().catch(e => {
            // canceling a request in browsers throws an error,
            // ignore it to avoid uncaught promise exceptions
            if (!completed) throw e;
          });
        },
      };
    },
  });
}
