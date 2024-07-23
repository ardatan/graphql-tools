---
'@graphql-tools/federation': patch
---

New options to configure query batching and batched delegation

```ts
{
  batchingOptions: {
    dataLoaderOptions: {
      maxBatchSize: 10, // Limits the query batching
    }
  },
  batchDelegateOptions: {
    maxBatchSize: 10, // Limits the batch delegation
  }
}
```

Learn more about these here;
[Batch Delegation](https://the-guild.dev/graphql/stitching/docs/approaches/schema-extensions#batch-delegation-array-batching)
[Query Batching](https://the-guild.dev/graphql/stitching/docs/getting-started/remote-subschemas#batch-the-executor-query-batching)
