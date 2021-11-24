---
'@graphql-tools/batch-delegate': patch
---

Support graphql-executor

batchDelegateToSchema currently assumes that the source fieldNodes are unique for each request, but this may not be the case when using executors such as graphql-executor. graphql-executor uses memoization to deliver the identical source fieldNodes object across requests, so functions operating on these fieldNodes can be memoized. This change ensures that batches are unique to requests, as long as the context object differs, using the same strategy that stitching makes use of with batch execution (getBatchingExecutor).
