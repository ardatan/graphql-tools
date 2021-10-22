---
'@graphql-tools/url-loader': patch
---


Correctly handle response cancelation for SSE (subscriptions and live queries) and HTTP Multipart responses (defer and stream).

`AbortController.signal` wasn't passed to `Request` while calling `fetch`, so it wasn't possible to stop the HTTP request by the user.

