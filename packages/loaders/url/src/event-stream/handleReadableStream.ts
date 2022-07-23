/* eslint-disable no-labels */

export async function* handleReadableStream(readableStream: ReadableStream<Uint8Array>) {
  const textDecoderStream = new TextDecoderStream();
  const decodedStream = readableStream.pipeThrough(textDecoderStream);
  const reader = decodedStream.getReader();
  outer: while (true) {
    const { value, done } = await reader.read();
    if (value) {
      for (const part of value.split('\n\n')) {
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
    if (done) {
      break;
    }
  }
}
