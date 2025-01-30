# @graphql-tools/batch-execute

### Functions

- [createBatchingExecutor](batch_execute_src#createbatchingexecutor)
- [getBatchingExecutor](batch_execute_src#getbatchingexecutor)

## Functions

### createBatchingExecutor

▸ **createBatchingExecutor**(`executor`, `dataLoaderOptions?`, `extensionsReducer?`):
[`Executor`](utils_src#executor)

#### Parameters

| Name                 | Type                                                                                                                                                                                                                      | Default value              |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------- |
| `executor`           | [`Executor`](utils_src#executor)                                                                                                                                                                                          | `undefined`                |
| `dataLoaderOptions?` | `Options`\<`any`, `any`, `any`>                                                                                                                                                                                           | `undefined`                |
| `extensionsReducer`  | (`mergedExtensions`: `Record`\<`string`, `any`>, `request`: [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`>) => `Record`\<`string`, `any`> | `defaultExtensionsReducer` |

#### Returns

[`Executor`](utils_src#executor)

#### Defined in

[packages/batch-execute/src/createBatchingExecutor.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-execute/src/createBatchingExecutor.ts#L13)

---

### getBatchingExecutor

▸ **getBatchingExecutor**(`_context`, `executor`, `dataLoaderOptions?`, `extensionsReducer?`):
[`Executor`](utils_src#executor)

#### Parameters

| Name                 | Type                                                                                                                                                                                                                      |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_context`           | `Record`\<`string`, `any`>                                                                                                                                                                                                |
| `executor`           | [`Executor`](utils_src#executor)                                                                                                                                                                                          |
| `dataLoaderOptions?` | `Options`\<`any`, `any`, `any`>                                                                                                                                                                                           |
| `extensionsReducer?` | (`mergedExtensions`: `Record`\<`string`, `any`>, `request`: [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`>) => `Record`\<`string`, `any`> |

#### Returns

[`Executor`](utils_src#executor)

#### Defined in

[packages/batch-execute/src/getBatchingExecutor.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-execute/src/getBatchingExecutor.ts#L5)
