---
'@graphql-tools/executor': patch
---

Abort listeners on a request `AbortSignal` are removed when query/mutation execution finishes, not only when the signal aborts.

`addEventListener('abort', listener, { once: true })` drops the listener only when abort fires. A successful request never aborts, so the function stayed on the signal. A new `AbortController` per request hid this. Reusing one signal (Yoga `useExecutionCancellation()` plus a stitched `buildHTTPExecutor({ fetch: yoga.fetch })` path) left one listener per finished query. Heap snapshots then grew with request count.

```ts
const signal = controller.signal;

await execute({ schema, document, signal });
await execute({ schema, document, signal });
// the first request's abort listener is now removed
```

Subscriptions still keep the listener until abort, so cancel can close the stream.
