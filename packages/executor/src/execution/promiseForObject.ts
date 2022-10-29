type ResolvedObject<TData> = {
  [TKey in keyof TData]: TData[TKey] extends Promise<infer TValue> ? TValue : TData[TKey];
};

/**
 * This function transforms a JS object `Record<string, Promise<T>>` into
 * a `Promise<Record<string, T>>`
 *
 * This is akin to bluebird's `Promise.props`, but implemented only using
 * `Promise.all` so it will work with any implementation of ES6 promises.
 */
export async function promiseForObject<TData>(object: TData): Promise<ResolvedObject<TData>> {
  const keys = Object.keys(object as any);
  const values = Object.values(object as any);

  const resolvedValues = await Promise.all(values);
  const resolvedObject = Object.create(null);
  for (let i = 0; i < keys.length; ++i) {
    resolvedObject[keys[i]] = resolvedValues[i];
  }
  return resolvedObject;
}
