/* eslint-disable no-labels */

let decodeUint8Array: (uint8Array: Uint8Array) => string;

if (globalThis.Buffer) {
  decodeUint8Array = uint8Array => globalThis.Buffer.from(uint8Array).toString('utf-8');
} else {
  const textDecoder = new TextDecoder();
  decodeUint8Array = uint8Array => textDecoder.decode(uint8Array);
}

export async function* handleReadable(readable: AsyncIterable<Uint8Array | string>) {
  outer: for await (const chunk of readable) {
    const chunkStr = typeof chunk === 'string' ? chunk : decodeUint8Array(chunk);
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
