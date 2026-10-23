---
'@graphql-tools/executor-yoga': major
---

Requires `graphql-yoga` v6: request logging uses `serverContext.log`, and the executor is disposed via the `onDispose` plugin hook.
