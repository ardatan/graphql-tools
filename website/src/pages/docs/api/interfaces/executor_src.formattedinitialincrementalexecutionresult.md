[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
FormattedInitialIncrementalExecutionResult

# Interface: FormattedInitialIncrementalExecutionResult<TData, TExtensions\>

[executor/src](../modules/executor_src).FormattedInitialIncrementalExecutionResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Hierarchy

- [`FormattedExecutionResult`](executor_src.FormattedExecutionResult)\<`TData`, `TExtensions`>

  ↳ **`FormattedInitialIncrementalExecutionResult`**

## Table of contents

### Properties

- [data](executor_src.FormattedInitialIncrementalExecutionResult#data)
- [errors](executor_src.FormattedInitialIncrementalExecutionResult#errors)
- [extensions](executor_src.FormattedInitialIncrementalExecutionResult#extensions)
- [hasNext](executor_src.FormattedInitialIncrementalExecutionResult#hasnext)
- [incremental](executor_src.FormattedInitialIncrementalExecutionResult#incremental)

## Properties

### data

• `Optional` **data**: `null` \| `TData`

#### Inherited from

[FormattedExecutionResult](executor_src.FormattedExecutionResult).[data](executor_src.FormattedExecutionResult#data)

#### Defined in

[packages/executor/src/execution/execute.ts:131](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L131)

---

### errors

• `Optional` **errors**: readonly `GraphQLFormattedError`[]

#### Inherited from

[FormattedExecutionResult](executor_src.FormattedExecutionResult).[errors](executor_src.FormattedExecutionResult#errors)

#### Defined in

[packages/executor/src/execution/execute.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L130)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Overrides

[FormattedExecutionResult](executor_src.FormattedExecutionResult).[extensions](executor_src.FormattedExecutionResult#extensions)

#### Defined in

[packages/executor/src/execution/execute.ts:162](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L162)

---

### hasNext

• **hasNext**: `boolean`

#### Defined in

[packages/executor/src/execution/execute.ts:160](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L160)

---

### incremental

• `Optional` **incremental**: readonly
[`FormattedIncrementalResult`](../modules/executor_src#formattedincrementalresult)\<`TData`,
`TExtensions`>[]

#### Defined in

[packages/executor/src/execution/execute.ts:161](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L161)
