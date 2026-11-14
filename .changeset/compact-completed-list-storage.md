---
'@graphql-tools/executor': patch
---

Reduce retained backing storage for small synchronous list results without reading input list lengths or changing iteration, scalar coercion, errors, or incremental delivery.
