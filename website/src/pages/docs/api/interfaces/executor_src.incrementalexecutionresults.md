[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
IncrementalExecutionResults

# Interface: IncrementalExecutionResults<TData, TExtensions\>

[executor/src](../modules/executor_src).IncrementalExecutionResults

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Table of contents

### Properties

- [initialResult](executor_src.IncrementalExecutionResults#initialresult)
- [subsequentResults](executor_src.IncrementalExecutionResults#subsequentresults)

## Properties

### initialResult

• **initialResult**:
[`InitialIncrementalExecutionResult`](executor_src.InitialIncrementalExecutionResult)\<`TData`,
`TExtensions`>

#### Defined in

[packages/executor/src/execution/execute.ts:139](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L139)

---

### subsequentResults

• **subsequentResults**:
`AsyncGenerator`\<[`SubsequentIncrementalExecutionResult`](executor_src.SubsequentIncrementalExecutionResult)\<`TData`,
`TExtensions`>, `void`, `void`>

#### Defined in

[packages/executor/src/execution/execute.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L140)
