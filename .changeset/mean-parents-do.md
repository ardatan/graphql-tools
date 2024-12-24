---
'@graphql-tools/utils': minor
---

Support the new incremental protocol for `mergeIncrementalResult`.

The `mergeIncrementalResult` function can now merge the [new response format without duplication](https://github.com/graphql/defer-stream-wg/discussions/69).

```ts
const executionResult = { data: { user: { name: 'John' } }, pending: [{ id: '0', path: [] }] };
const incrementalResult = { incremental: [{ id: '0', data: { user: { age: 42 } } }] };

console.log(mergeIncrementalResult({ incrementalResult, executionResult }));
// logs: { user: { age: 42, name: 'John' } }
```
