---
'@graphql-tools/executor-legacy-ws': patch
---

**Security:** Isolate legacy GraphQL WebSocket executions on a shared `buildWSLegacyExecutor()`.

A single executor reused across callers kept `extensions.connectionParams` for the lifetime of the closure and installed one `websocket.onmessage` handler. A later request could be authenticated with a previous caller's `connection_init` payload ([GHSA-434m-5hcj-pxf3](https://github.com/ardatan/graphql-tools/security/advisories/GHSA-434m-5hcj-pxf3), CWE-613), and an overlapping subscription could receive another operation's `data` frames because the handler ignored the protocol operation id ([GHSA-mp66-8ww2-pcwm](https://github.com/ardatan/graphql-tools/security/advisories/GHSA-mp66-8ww2-pcwm), CWE-200).

### Corrected behavior

- Each execution opens its own socket. `connection_init` is built from the executor's base `connectionParams` plus that request's `extensions.connectionParams` only.
- `data`, `error`, and `complete` frames are delivered only when `id` matches the operation that socket started.
- Operation ids are no longer `Date.now()`.
