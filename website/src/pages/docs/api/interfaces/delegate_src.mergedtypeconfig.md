[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / MergedTypeConfig

# Interface: MergedTypeConfig<K, V, TContext\>

[delegate/src](../modules/delegate_src).MergedTypeConfig

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `K`        | `any`                      |
| `V`        | `any`                      |
| `TContext` | `Record`\<`string`, `any`> |

## Hierarchy

- [`MergedTypeEntryPoint`](delegate_src.MergedTypeEntryPoint)\<`K`, `V`, `TContext`>

  ↳ **`MergedTypeConfig`**

## Table of contents

### Properties

- [args](delegate_src.MergedTypeConfig#args)
- [argsFromKeys](delegate_src.MergedTypeConfig#argsfromkeys)
- [canonical](delegate_src.MergedTypeConfig#canonical)
- [dataLoaderOptions](delegate_src.MergedTypeConfig#dataloaderoptions)
- [entryPoints](delegate_src.MergedTypeConfig#entrypoints)
- [fieldName](delegate_src.MergedTypeConfig#fieldname)
- [fields](delegate_src.MergedTypeConfig#fields)
- [key](delegate_src.MergedTypeConfig#key)
- [resolve](delegate_src.MergedTypeConfig#resolve)
- [selectionSet](delegate_src.MergedTypeConfig#selectionset)
- [valuesFromResults](delegate_src.MergedTypeConfig#valuesfromresults)

## Properties

### args

• `Optional` **args**: (`originalResult`: `any`) => `Record`\<`string`, `any`>

#### Type declaration

▸ (`originalResult`): `Record`\<`string`, `any`>

##### Parameters

| Name             | Type  |
| :--------------- | :---- |
| `originalResult` | `any` |

##### Returns

`Record`\<`string`, `any`>

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[args](delegate_src.MergedTypeEntryPoint#args)

#### Defined in

[packages/delegate/src/types.ts:180](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L180)

---

### argsFromKeys

• `Optional` **argsFromKeys**: (`keys`: readonly `K`[]) => `Record`\<`string`, `any`>

#### Type declaration

▸ (`keys`): `Record`\<`string`, `any`>

##### Parameters

| Name   | Type           |
| :----- | :------------- |
| `keys` | readonly `K`[] |

##### Returns

`Record`\<`string`, `any`>

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[argsFromKeys](delegate_src.MergedTypeEntryPoint#argsfromkeys)

#### Defined in

[packages/delegate/src/types.ts:181](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L181)

---

### canonical

• `Optional` **canonical**: `boolean`

#### Defined in

[packages/delegate/src/types.ts:168](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L168)

---

### dataLoaderOptions

• `Optional` **dataLoaderOptions**: `Options`\<`K`, `V`, `K`>

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[dataLoaderOptions](delegate_src.MergedTypeEntryPoint#dataloaderoptions)

#### Defined in

[packages/delegate/src/types.ts:183](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L183)

---

### entryPoints

• `Optional` **entryPoints**: [`MergedTypeEntryPoint`](delegate_src.MergedTypeEntryPoint)\<`any`,
`any`, `Record`\<`string`, `any`>>[]

#### Defined in

[packages/delegate/src/types.ts:166](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L166)

---

### fieldName

• `Optional` **fieldName**: `string`

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[fieldName](delegate_src.MergedTypeEntryPoint#fieldname)

#### Defined in

[packages/delegate/src/types.ts:179](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L179)

---

### fields

• `Optional` **fields**: `Record`\<`string`, [`MergedFieldConfig`](delegate_src.MergedFieldConfig)>

#### Defined in

[packages/delegate/src/types.ts:167](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L167)

---

### key

• `Optional` **key**: (`originalResult`: `any`) => `K` \| `PromiseLike`\<`K`>

#### Type declaration

▸ (`originalResult`): `K` \| `PromiseLike`\<`K`>

##### Parameters

| Name             | Type  |
| :--------------- | :---- |
| `originalResult` | `any` |

##### Returns

`K` \| `PromiseLike`\<`K`>

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[key](delegate_src.MergedTypeEntryPoint#key)

#### Defined in

[packages/delegate/src/types.ts:174](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L174)

---

### resolve

• `Optional` **resolve**:
[`MergedTypeResolver`](../modules/delegate_src#mergedtyperesolver)\<`TContext`>

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[resolve](delegate_src.MergedTypeEntryPoint#resolve)

#### Defined in

[packages/delegate/src/types.ts:175](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L175)

---

### selectionSet

• `Optional` **selectionSet**: `string`

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[selectionSet](delegate_src.MergedTypeEntryPoint#selectionset)

#### Defined in

[packages/delegate/src/types.ts:173](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L173)

---

### valuesFromResults

• `Optional` **valuesFromResults**: (`results`: `any`, `keys`: readonly `K`[]) => `V`[]

#### Type declaration

▸ (`results`, `keys`): `V`[]

##### Parameters

| Name      | Type           |
| :-------- | :------------- |
| `results` | `any`          |
| `keys`    | readonly `K`[] |

##### Returns

`V`[]

#### Inherited from

[MergedTypeEntryPoint](delegate_src.MergedTypeEntryPoint).[valuesFromResults](delegate_src.MergedTypeEntryPoint#valuesfromresults)

#### Defined in

[packages/delegate/src/types.ts:182](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L182)
