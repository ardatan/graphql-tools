[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
FormattedIncrementalDeferResult

# Interface: FormattedIncrementalDeferResult<TData, TExtensions\>

[executor/src](../modules/executor_src).FormattedIncrementalDeferResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Hierarchy

- [`FormattedExecutionResult`](executor_src.FormattedExecutionResult)\<`TData`, `TExtensions`>

  ↳ **`FormattedIncrementalDeferResult`**

## Table of contents

### Properties

- [data](executor_src.FormattedIncrementalDeferResult#data)
- [errors](executor_src.FormattedIncrementalDeferResult#errors)
- [extensions](executor_src.FormattedIncrementalDeferResult#extensions)
- [label](executor_src.FormattedIncrementalDeferResult#label)
- [path](executor_src.FormattedIncrementalDeferResult#path)

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

#### Inherited from

[FormattedExecutionResult](executor_src.FormattedExecutionResult).[extensions](executor_src.FormattedExecutionResult#extensions)

#### Defined in

[packages/executor/src/execution/execute.ts:132](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L132)

---

### label

• `Optional` **label**: `string`

#### Defined in

[packages/executor/src/execution/execute.ts:196](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L196)

---

### path

• `Optional` **path**: readonly (`string` \| `number`)[]

#### Defined in

[packages/executor/src/execution/execute.ts:195](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L195)
