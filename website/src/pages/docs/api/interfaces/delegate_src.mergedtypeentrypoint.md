[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / MergedTypeEntryPoint

# Interface: MergedTypeEntryPoint<K, V, TContext\>

[delegate/src](../modules/delegate_src).MergedTypeEntryPoint

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `K`        | `any`                      |
| `V`        | `any`                      |
| `TContext` | `Record`\<`string`, `any`> |

## Hierarchy

- [`MergedTypeResolverOptions`](delegate_src.MergedTypeResolverOptions)\<`K`, `V`>

  ↳ **`MergedTypeEntryPoint`**

  ↳↳ [`MergedTypeConfig`](delegate_src.MergedTypeConfig)

## Table of contents

### Properties

- [args](delegate_src.MergedTypeEntryPoint#args)
- [argsFromKeys](delegate_src.MergedTypeEntryPoint#argsfromkeys)
- [dataLoaderOptions](delegate_src.MergedTypeEntryPoint#dataloaderoptions)
- [fieldName](delegate_src.MergedTypeEntryPoint#fieldname)
- [key](delegate_src.MergedTypeEntryPoint#key)
- [resolve](delegate_src.MergedTypeEntryPoint#resolve)
- [selectionSet](delegate_src.MergedTypeEntryPoint#selectionset)
- [valuesFromResults](delegate_src.MergedTypeEntryPoint#valuesfromresults)

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

[MergedTypeResolverOptions](delegate_src.MergedTypeResolverOptions).[args](delegate_src.MergedTypeResolverOptions#args)

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

[MergedTypeResolverOptions](delegate_src.MergedTypeResolverOptions).[argsFromKeys](delegate_src.MergedTypeResolverOptions#argsfromkeys)

#### Defined in

[packages/delegate/src/types.ts:181](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L181)

---

### dataLoaderOptions

• `Optional` **dataLoaderOptions**: `Options`\<`K`, `V`, `K`>

#### Inherited from

[MergedTypeResolverOptions](delegate_src.MergedTypeResolverOptions).[dataLoaderOptions](delegate_src.MergedTypeResolverOptions#dataloaderoptions)

#### Defined in

[packages/delegate/src/types.ts:183](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L183)

---

### fieldName

• `Optional` **fieldName**: `string`

#### Inherited from

[MergedTypeResolverOptions](delegate_src.MergedTypeResolverOptions).[fieldName](delegate_src.MergedTypeResolverOptions#fieldname)

#### Defined in

[packages/delegate/src/types.ts:179](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L179)

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

#### Defined in

[packages/delegate/src/types.ts:174](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L174)

---

### resolve

• `Optional` **resolve**:
[`MergedTypeResolver`](../modules/delegate_src#mergedtyperesolver)\<`TContext`>

#### Defined in

[packages/delegate/src/types.ts:175](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L175)

---

### selectionSet

• `Optional` **selectionSet**: `string`

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

[MergedTypeResolverOptions](delegate_src.MergedTypeResolverOptions).[valuesFromResults](delegate_src.MergedTypeResolverOptions#valuesfromresults)

#### Defined in

[packages/delegate/src/types.ts:182](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L182)
