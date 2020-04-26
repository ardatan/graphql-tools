/* eslint-disable callback-return */
/* eslint-disable @typescript-eslint/await-thenable */

function isAsyncIterable<T>(obj: any): obj is AsyncIterable<T> {
  return Symbol.asyncIterator in obj;
}

export async function forAwaitEach<T>(
  obj: AsyncIterable<T> | T,
  callback: (i: T) => any | Promise<any>,
) {
  if (isAsyncIterable(obj)) {
    for await (const i of obj) {
      await callback(i);
    }
  } else {
    await callback(obj);
  }
}
