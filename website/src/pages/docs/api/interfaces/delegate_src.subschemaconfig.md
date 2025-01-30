[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / SubschemaConfig

# Interface: SubschemaConfig<K, V, C, TContext\>

[delegate/src](../modules/delegate_src).SubschemaConfig

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `K`        | `any`                      |
| `V`        | `any`                      |
| `C`        | `K`                        |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [batch](delegate_src.SubschemaConfig#batch)
- [batchingOptions](delegate_src.SubschemaConfig#batchingoptions)
- [createProxyingResolver](delegate_src.SubschemaConfig#createproxyingresolver)
- [executor](delegate_src.SubschemaConfig#executor)
- [merge](delegate_src.SubschemaConfig#merge)
- [rootValue](delegate_src.SubschemaConfig#rootvalue)
- [schema](delegate_src.SubschemaConfig#schema)
- [transforms](delegate_src.SubschemaConfig#transforms)

## Properties

### batch

• `Optional` **batch**: `boolean`

#### Defined in

[packages/delegate/src/types.ts:160](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L160)

---

### batchingOptions

• `Optional` **batchingOptions**: [`BatchingOptions`](delegate_src.BatchingOptions)\<`K`, `V`, `C`>

#### Defined in

[packages/delegate/src/types.ts:161](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L161)

---

### createProxyingResolver

• `Optional` **createProxyingResolver**:
[`CreateProxyingResolverFn`](../modules/delegate_src#createproxyingresolverfn)\<`TContext`>

#### Defined in

[packages/delegate/src/types.ts:155](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L155)

---

### executor

• `Optional` **executor**: [`Executor`](../modules/utils_src#executor)\<`TContext`>

#### Defined in

[packages/delegate/src/types.ts:159](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L159)

---

### merge

• `Optional` **merge**: `Record`\<`string`,
[`MergedTypeConfig`](delegate_src.MergedTypeConfig)\<`any`, `any`, `TContext`>>

#### Defined in

[packages/delegate/src/types.ts:158](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L158)

---

### rootValue

• `Optional` **rootValue**: `any`

#### Defined in

[packages/delegate/src/types.ts:156](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L156)

---

### schema

• **schema**: `GraphQLSchema`

#### Defined in

[packages/delegate/src/types.ts:154](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L154)

---

### transforms

• `Optional` **transforms**: [`Transform`](delegate_src.Transform)\<`any`, `TContext`>[]

#### Defined in

[packages/delegate/src/types.ts:157](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L157)
