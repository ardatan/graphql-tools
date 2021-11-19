---
'@graphql-tools/url-loader': patch
---

adjust accept headers sent to the server.

- `text/event-stream` is only sent if Subscriptions are executed over SSE (GET).
- `multipart/mixed` is only send for POST requests
