---
'@graphql-tools/executor': patch
---

Avoid allocating indexed paths for successful synchronous scalar and enum list items while retaining scalar serialization, error locations, asynchronous completion and incremental delivery behavior.
