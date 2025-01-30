[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
IncrementalStreamResult

# Interface: IncrementalStreamResult<TData, TExtensions\>

[executor/src](../modules/executor_src).IncrementalStreamResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `unknown`[]                    |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Table of contents

### Properties

- [errors](executor_src.IncrementalStreamResult#errors)
- [extensions](executor_src.IncrementalStreamResult#extensions)
- [items](executor_src.IncrementalStreamResult#items)
- [label](executor_src.IncrementalStreamResult#label)
- [path](executor_src.IncrementalStreamResult#path)

## Properties

### errors

• `Optional` **errors**: readonly `GraphQLError`[]

#### Defined in

[packages/executor/src/execution/execute.ts:203](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L203)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/executor/src/execution/execute.ts:207](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L207)

---

### items

• `Optional` **items**: `null` \| `TData`

#### Defined in

[packages/executor/src/execution/execute.ts:204](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L204)

---

### label

• `Optional` **label**: `string`

#### Defined in

[packages/executor/src/execution/execute.ts:206](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L206)

---

### path

• `Optional` **path**: readonly (`string` \| `number`)[]

#### Defined in

[packages/executor/src/execution/execute.ts:205](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L205)
