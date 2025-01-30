[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
SingularExecutionResult

# Interface: SingularExecutionResult<TData, TExtensions\>

[executor/src](../modules/executor_src).SingularExecutionResult

## Type parameters

| Name          | Type  |
| :------------ | :---- |
| `TData`       | `any` |
| `TExtensions` | `any` |

## Hierarchy

- **`SingularExecutionResult`**

  ↳ [`InitialIncrementalExecutionResult`](executor_src.InitialIncrementalExecutionResult)

  ↳ [`IncrementalDeferResult`](executor_src.IncrementalDeferResult)

## Table of contents

### Properties

- [data](executor_src.SingularExecutionResult#data)
- [errors](executor_src.SingularExecutionResult#errors)
- [extensions](executor_src.SingularExecutionResult#extensions)

## Properties

### data

• `Optional` **data**: `null` \| `TData`

#### Defined in

[packages/executor/src/execution/execute.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L62)

---

### errors

• `Optional` **errors**: readonly `GraphQLError`[]

#### Defined in

[packages/executor/src/execution/execute.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L61)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/executor/src/execution/execute.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L63)
