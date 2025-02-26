---
'@graphql-tools/executor': patch
'@graphql-tools/utils': patch
---

In executor, do not use leaking `registerAbortSignalListener`, and handle listeners inside the
execution context
