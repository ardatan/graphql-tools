---
'@graphql-tools/load': patch
---

Replace `p-limit` with a small inline concurrency limiter for source collection, and parse loaded sources synchronously since that step is CPU-bound.
