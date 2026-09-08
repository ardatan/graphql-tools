---
'@graphql-tools/executor-legacy-ws': patch
'@graphql-tools/url-loader': patch
---

Enable TLS certificate validation by default in the legacy WebSocket executor (`rejectUnauthorized` now defaults to `true`, with an opt-out for trusted self-signed setups). Fixes GHSA-6fw5-9hq8-w87g.
