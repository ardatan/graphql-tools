[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
IncrementalDeferResult

# Interface: IncrementalDeferResult<TData, TExtensions\>

[executor/src](../modules/executor_src).IncrementalDeferResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Hierarchy

- [`SingularExecutionResult`](executor_src.SingularExecutionResult)\<`TData`, `TExtensions`>

  ↳ **`IncrementalDeferResult`**

## Table of contents

### Properties

- [data](executor_src.IncrementalDeferResult#data)
- [errors](executor_src.IncrementalDeferResult#errors)
- [extensions](executor_src.IncrementalDeferResult#extensions)
- [label](executor_src.IncrementalDeferResult#label)
- [path](executor_src.IncrementalDeferResult#path)

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

#### Inherited from

[SingularExecutionResult](executor_src.SingularExecutionResult).[extensions](executor_src.SingularExecutionResult#extensions)

#### Defined in

[packages/executor/src/execution/execute.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L63)

---

### label

• `Optional` **label**: `string`

#### Defined in

[packages/executor/src/execution/execute.ts:188](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L188)

---

### path

• `Optional` **path**: readonly (`string` \| `number`)[]

#### Defined in

[packages/executor/src/execution/execute.ts:187](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L187)
