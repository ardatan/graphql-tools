---
'@graphql-tools/url-loader': patch
---

fix(url-loader): abort responses with stream(SSE, live queries or defer/stream) from GET requests properly

While calling `fetch`, `AbortController.signal` wasn't passed to `Request` so it wasn't possible to stop the HTTP request by the user.

