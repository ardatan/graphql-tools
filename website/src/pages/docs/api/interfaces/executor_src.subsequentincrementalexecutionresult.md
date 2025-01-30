[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
SubsequentIncrementalExecutionResult

# Interface: SubsequentIncrementalExecutionResult<TData, TExtensions\>

[executor/src](../modules/executor_src).SubsequentIncrementalExecutionResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Table of contents

### Properties

- [extensions](executor_src.SubsequentIncrementalExecutionResult#extensions)
- [hasNext](executor_src.SubsequentIncrementalExecutionResult#hasnext)
- [incremental](executor_src.SubsequentIncrementalExecutionResult#incremental)

## Properties

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/executor/src/execution/execute.ts:171](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L171)

---

### hasNext

• **hasNext**: `boolean`

#### Defined in

[packages/executor/src/execution/execute.ts:169](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L169)

---

### incremental

• `Optional` **incremental**: readonly
[`IncrementalResult`](../modules/executor_src#incrementalresult)\<`TData`, `TExtensions`>[]

#### Defined in

[packages/executor/src/execution/execute.ts:170](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L170)
