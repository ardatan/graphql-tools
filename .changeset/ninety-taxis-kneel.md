---
'@graphql-tools/url-loader': minor
---

Do not pass credentials: same-origin by default because it is already default per spec

This prevents an error like (The 'credentials' field on 'RequestInitializerDict' is not implemented.) on the environments that don't support `credentials` flag like CF Workers.
