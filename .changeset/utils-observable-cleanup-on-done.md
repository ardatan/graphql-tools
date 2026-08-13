---
'@graphql-tools/utils': patch
---

Clean up `observableToAsyncIterable` queues and unsubscribe when the observable completes, so iterators do not retain references after `done`. Fixes leak detection flakes related to #8057.
