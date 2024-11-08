import { ExecutionResult, inspect } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { TextDecoder } from '@whatwg-node/fetch';

const DELIM = '\n\n';

export function isReadableStream(value: any): value is ReadableStream {
  return value && typeof value.getReader === 'function';
}

export function handleEventStreamResponse(response: Response) {
  // node-fetch returns body as a promise so we need to resolve it
  const body = response.body;
  if (!isReadableStream(body)) {
    throw new Error('Response body is expected to be a readable stream but got; ' + inspect(body));
  }

  return new Repeater<ExecutionResult>((push, stop) => {
    const decoder = new TextDecoder();

    const reader = body.getReader();
    reader.closed.then(stop).catch(stop); // we dont use `finally` because we want to catch errors
    stop.finally(() => reader.cancel());

    let currChunk = '';
    async function pump() {
      const { done, value: chunk } = await reader.read();
      if (done) {
        return stop();
      }

      currChunk += typeof chunk === 'string' ? chunk : decoder.decode(chunk);
      for (;;) {
        const delimIndex = currChunk.indexOf(DELIM);
        if (delimIndex === -1) {
          // incomplete message, wait for more chunks
          break;
        }

        const msg = currChunk.slice(0, delimIndex); // whole message
        currChunk = currChunk.slice(delimIndex + DELIM.length); // remainder

        // data
        const dataStr = msg.split('data:')[1]?.trim();
        if (dataStr) {
          const data = JSON.parse(dataStr);
          await push(data.payload || data);
        }

        // event
        const event = msg.split('event:')[1]?.trim();
        if (event === 'complete') {
          return stop();
        }
      }

      return pump();
    }

    return pump();
  });
}
