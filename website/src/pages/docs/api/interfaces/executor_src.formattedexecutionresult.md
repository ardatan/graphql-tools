[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
FormattedExecutionResult

# Interface: FormattedExecutionResult<TData, TExtensions\>

[executor/src](../modules/executor_src).FormattedExecutionResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Hierarchy

- **`FormattedExecutionResult`**

  ↳
  [`FormattedInitialIncrementalExecutionResult`](executor_src.FormattedInitialIncrementalExecutionResult)

  ↳ [`FormattedIncrementalDeferResult`](executor_src.FormattedIncrementalDeferResult)

## Table of contents

### Properties

- [data](executor_src.FormattedExecutionResult#data)
- [errors](executor_src.FormattedExecutionResult#errors)
- [extensions](executor_src.FormattedExecutionResult#extensions)

## Properties

### data

• `Optional` **data**: `null` \| `TData`

#### Defined in

[packages/executor/src/execution/execute.ts:131](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L131)

---

### errors

• `Optional` **errors**: readonly `GraphQLFormattedError`[]

#### Defined in

[packages/executor/src/execution/execute.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L130)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/executor/src/execution/execute.ts:132](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L132)
