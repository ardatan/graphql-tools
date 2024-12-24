---
'@graphql-tools/utils': minor
---

- New helper function `getAbortPromise` to get a promise rejected when `AbortSignal` is aborted
- New helper function `registerAbortSignalListener` to register a listener to abort a promise when `AbortSignal` is aborted

Instead of using `.addEventListener('abort', () => {/* ... */})`, we register a single listener to avoid warnings on Node.js like `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 abort listeners added. Use emitter.setMaxListeners() to increase limit`.
