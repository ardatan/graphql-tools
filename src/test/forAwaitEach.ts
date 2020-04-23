export async function forAwaitEach<T>(
  asyncIterable: AsyncIterable<T>,
  callback: (i: T) => any | Promise<any>,
) {
  for await (const i of asyncIterable) {
    // eslint-disable-next-line callback-return
    await callback(i);
  }
}
