---
'@graphql-tools/executor': patch
'@graphql-tools/utils': patch
---

- Forward `info.getAsyncHelpers().track()` to `context.waitUntil` when present so tracked async work stays alive under Yoga (and similar runtimes).
- Extend `GraphQLResolveInfo` with async helpers and `getAbortSignal()` method to match the behavior of GraphQL v17
