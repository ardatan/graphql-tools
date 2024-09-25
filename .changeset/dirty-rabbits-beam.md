---
'@graphql-tools/executor-graphql-ws': patch
---

`webSocketImpl` and `lazy` options were ignored and overriden by default values. This is no longer
the case and it's now possible to change the `WebSocket` implementation.
