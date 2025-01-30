[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
InitialIncrementalExecutionResult

# Interface: InitialIncrementalExecutionResult<TData, TExtensions\>

[executor/src](../modules/executor_src).InitialIncrementalExecutionResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Hierarchy

- [`SingularExecutionResult`](executor_src.SingularExecutionResult)\<`TData`, `TExtensions`>

  ↳ **`InitialIncrementalExecutionResult`**

## Table of contents

### Properties

- [data](executor_src.InitialIncrementalExecutionResult#data)
- [errors](executor_src.InitialIncrementalExecutionResult#errors)
- [extensions](executor_src.InitialIncrementalExecutionResult#extensions)
- [hasNext](executor_src.InitialIncrementalExecutionResult#hasnext)
- [incremental](executor_src.InitialIncrementalExecutionResult#incremental)

## Properties

### data

• `Optional` **data**: `null` \| `TData`

#### Inherited from

[SingularExecutionResult](executor_src.SingularExecutionResult).[data](executor_src.SingularExecutionResult#data)

#### Defined in

[packages/executor/src/execution/execute.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L62)

---

### errors

• `Optional` **errors**: readonly `GraphQLError`[]

#### Inherited from

[SingularExecutionResult](executor_src.SingularExecutionResult).[errors](executor_src.SingularExecutionResult#errors)

#### Defined in

[packages/executor/src/execution/execute.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L61)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Overrides

[SingularExecutionResult](executor_src.SingularExecutionResult).[extensions](executor_src.SingularExecutionResult#extensions)

#### Defined in

[packages/executor/src/execution/execute.ts:153](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L153)

---

### hasNext

• **hasNext**: `boolean`

#### Defined in

[packages/executor/src/execution/execute.ts:151](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L151)

---

### incremental

• `Optional` **incremental**: readonly
[`IncrementalResult`](../modules/executor_src#incrementalresult)\<`TData`, `TExtensions`>[]

#### Defined in

[packages/executor/src/execution/execute.ts:152](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L152)
