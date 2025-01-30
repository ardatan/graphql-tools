[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) /
FormattedIncrementalStreamResult

# Interface: FormattedIncrementalStreamResult<TData, TExtensions\>

[executor/src](../modules/executor_src).FormattedIncrementalStreamResult

## Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `unknown`[]                    |
| `TExtensions` | `Record`\<`string`, `unknown`> |

## Table of contents

### Properties

- [errors](executor_src.FormattedIncrementalStreamResult#errors)
- [extensions](executor_src.FormattedIncrementalStreamResult#extensions)
- [items](executor_src.FormattedIncrementalStreamResult#items)
- [label](executor_src.FormattedIncrementalStreamResult#label)
- [path](executor_src.FormattedIncrementalStreamResult#path)

## Properties

### errors

• `Optional` **errors**: readonly `GraphQLFormattedError`[]

#### Defined in

[packages/executor/src/execution/execute.ts:214](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L214)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/executor/src/execution/execute.ts:218](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L218)

---

### items

• `Optional` **items**: `null` \| `TData`

#### Defined in

[packages/executor/src/execution/execute.ts:215](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L215)

---

### label

• `Optional` **label**: `string`

#### Defined in

[packages/executor/src/execution/execute.ts:217](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L217)

---

### path

• `Optional` **path**: readonly (`string` \| `number`)[]

#### Defined in

[packages/executor/src/execution/execute.ts:216](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L216)
