[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / Subschema

# Class: Subschema<K, V, C, TContext\>

[delegate/src](../modules/delegate_src).Subschema

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `K`        | `any`                      |
| `V`        | `any`                      |
| `C`        | `K`                        |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- `ISubschema`\<`K`, `V`, `C`, `TContext`>

## Table of contents

### Constructors

- [constructor](delegate_src.Subschema#constructor)

### Properties

- [batch](delegate_src.Subschema#batch)
- [batchingOptions](delegate_src.Subschema#batchingoptions)
- [createProxyingResolver](delegate_src.Subschema#createproxyingresolver)
- [executor](delegate_src.Subschema#executor)
- [merge](delegate_src.Subschema#merge)
- [schema](delegate_src.Subschema#schema)
- [transforms](delegate_src.Subschema#transforms)

### Accessors

- [transformedSchema](delegate_src.Subschema#transformedschema)

## Constructors

### constructor

• **new Subschema**<`K`, `V`, `C`, `TContext`\>(`config`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `K`        | `any`                      |
| `V`        | `any`                      |
| `C`        | `K`                        |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                                                                                               |
| :------- | :------------------------------------------------------------------------------------------------- |
| `config` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`K`, `V`, `C`, `TContext`> |

#### Defined in

[packages/delegate/src/Subschema.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L36)

## Properties

### batch

• `Optional` **batch**: `boolean`

#### Implementation of

ISubschema.batch

#### Defined in

[packages/delegate/src/Subschema.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L27)

---

### batchingOptions

• `Optional` **batchingOptions**:
[`BatchingOptions`](/docs/api/interfaces/delegate_src.BatchingOptions)\<`K`, `V`, `C`>

#### Implementation of

ISubschema.batchingOptions

#### Defined in

[packages/delegate/src/Subschema.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L28)

---

### createProxyingResolver

• `Optional` **createProxyingResolver**:
[`CreateProxyingResolverFn`](../modules/delegate_src#createproxyingresolverfn)\<`TContext`>

#### Implementation of

ISubschema.createProxyingResolver

#### Defined in

[packages/delegate/src/Subschema.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L30)

---

### executor

• `Optional` **executor**: [`Executor`](../modules/utils_src#executor)\<`TContext`>

#### Implementation of

ISubschema.executor

#### Defined in

[packages/delegate/src/Subschema.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L26)

---

### merge

• `Optional` **merge**: `Record`\<`string`,
[`MergedTypeConfig`](/docs/api/interfaces/delegate_src.MergedTypeConfig)\<`any`, `any`, `TContext`>>

#### Implementation of

ISubschema.merge

#### Defined in

[packages/delegate/src/Subschema.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L34)

---

### schema

• **schema**: `GraphQLSchema`

#### Implementation of

ISubschema.schema

#### Defined in

[packages/delegate/src/Subschema.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L24)

---

### transforms

• **transforms**: [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`any`, `TContext`>[]

#### Implementation of

ISubschema.transforms

#### Defined in

[packages/delegate/src/Subschema.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L31)

## Accessors

### transformedSchema

• `get` **transformedSchema**(): `GraphQLSchema`

#### Returns

`GraphQLSchema`

#### Implementation of

ISubschema.transformedSchema

#### Defined in

[packages/delegate/src/Subschema.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L49)

• `set` **transformedSchema**(`value`): `void`

#### Parameters

| Name    | Type            |
| :------ | :-------------- |
| `value` | `GraphQLSchema` |

#### Returns

`void`

#### Implementation of

ISubschema.transformedSchema

#### Defined in

[packages/delegate/src/Subschema.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L59)
