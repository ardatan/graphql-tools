---
'@graphql-tools/utils': patch
---

`onError` and `onEnd` callbacks from `mapAsyncIterator` are invoked only once regardless of how many
times `throw`/`return` was called on the iterator
