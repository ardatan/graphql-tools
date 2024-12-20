---
'@graphql-tools/executor': patch
---

Surpress the "possible EventEmitter memory leak detected." warning occuring on Node.js when passing
a `AbortSignal` to `execute`.

Each execution will now only set up a single listener on the supplied `AbortSignal`. While the warning is harmless it can be misleading, which is the main motivation of this change.
