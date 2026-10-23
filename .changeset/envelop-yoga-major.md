---
'@graphql-tools/executor-envelop': patch
'@graphql-tools/executor-yoga': major
---

`@graphql-tools/executor-yoga` now requires `graphql-yoga` v6.

It logs through the request-scoped Hive Logger (`serverContext.log`) and disposes the executor via the `onDispose` plugin hook. Those APIs are not available on Yoga v3–v5, so the peer range is tightened to `graphql-yoga@^6.0.0`.

`@graphql-tools/executor-envelop` only widens its `@envelop/core` peer to include v6. The plugin hooks it uses are unchanged, so Envelop v3–v5 remain supported.
