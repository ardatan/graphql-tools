[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / ExecutionResult

# Interface: ExecutionResult<TData, TExtensions\>

[utils/src](../modules/utils_src).ExecutionResult

The result of GraphQL execution.

- `errors` is included when any errors occurred as a non-empty array.
- `data` is the result of a successful execution of the query.
- `hasNext` is true if a future payload is expected.
- `extensions` is reserved for adding non-standard properties.

## Type parameters

| Name          | Type  |
| :------------ | :---- |
| `TData`       | `any` |
| `TExtensions` | `any` |

## Table of contents

### Properties

- [data](utils_src.ExecutionResult#data)
- [errors](utils_src.ExecutionResult#errors)
- [extensions](utils_src.ExecutionResult#extensions)
- [hasNext](utils_src.ExecutionResult#hasnext)
- [incremental](utils_src.ExecutionResult#incremental)
- [items](utils_src.ExecutionResult#items)
- [label](utils_src.ExecutionResult#label)
- [path](utils_src.ExecutionResult#path)

## Properties

### data

• `Optional` **data**: `null` \| `TData`

#### Defined in

[packages/utils/src/Interfaces.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L62)

---

### errors

• `Optional` **errors**: readonly `GraphQLError`[]

#### Defined in

[packages/utils/src/Interfaces.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L63)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/utils/src/Interfaces.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L65)

---

### hasNext

• `Optional` **hasNext**: `boolean`

#### Defined in

[packages/utils/src/Interfaces.ts:64](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L64)

---

### incremental

• `Optional` **incremental**: readonly [`ExecutionResult`](utils_src.ExecutionResult)\<`TData`,
`TExtensions`>[]

#### Defined in

[packages/utils/src/Interfaces.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L61)

---

### items

• `Optional` **items**: `null` \| `TData`

#### Defined in

[packages/utils/src/Interfaces.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L68)

---

### label

• `Optional` **label**: `string`

#### Defined in

[packages/utils/src/Interfaces.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L66)

---

### path

• `Optional` **path**: readonly (`string` \| `number`)[]

#### Defined in

[packages/utils/src/Interfaces.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L67)
