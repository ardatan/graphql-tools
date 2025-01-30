[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
FormattedSubsequentIncrementalExecutionResult

# Interface: FormattedSubsequentIncrementalExecutionResult<TData, TExtensions\>

[executor/src](../modules/executor_src).FormattedSubsequentIncrementalExecutionResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Table of contents

### Properties

- [extensions](executor_src.FormattedSubsequentIncrementalExecutionResult#extensions)
- [hasNext](executor_src.FormattedSubsequentIncrementalExecutionResult#hasnext)
- [incremental](executor_src.FormattedSubsequentIncrementalExecutionResult#incremental)

## Properties

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/executor/src/execution/execute.ts:180](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L180)

---

### hasNext

• **hasNext**: `boolean`

#### Defined in

[packages/executor/src/execution/execute.ts:178](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L178)

---

### incremental

• `Optional` **incremental**: readonly
[`FormattedIncrementalResult`](../modules/executor_src#formattedincrementalresult)\<`TData`,
`TExtensions`>[]

#### Defined in

[packages/executor/src/execution/execute.ts:179](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L179)
