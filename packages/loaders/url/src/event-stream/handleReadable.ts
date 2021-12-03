/* eslint-disable no-labels */

export async function* handleReadable(readable: AsyncIterable<Uint8Array>) {
  const decoder = new TextDecoder();
  outer: for await (const chunk of readable) {
    const chunkStr = decoder.decode(chunk);
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
