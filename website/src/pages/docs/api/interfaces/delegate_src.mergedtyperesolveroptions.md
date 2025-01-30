[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) /
MergedTypeResolverOptions

# Interface: MergedTypeResolverOptions<K, V\>

[delegate/src](../modules/delegate_src).MergedTypeResolverOptions

## Type parameters

| Name | Type  |
| :--- | :---- |
| `K`  | `any` |
| `V`  | `any` |

## Hierarchy

- **`MergedTypeResolverOptions`**

  ↳ [`MergedTypeEntryPoint`](delegate_src.MergedTypeEntryPoint)

## Table of contents

### Properties

- [args](delegate_src.MergedTypeResolverOptions#args)
- [argsFromKeys](delegate_src.MergedTypeResolverOptions#argsfromkeys)
- [dataLoaderOptions](delegate_src.MergedTypeResolverOptions#dataloaderoptions)
- [fieldName](delegate_src.MergedTypeResolverOptions#fieldname)
- [valuesFromResults](delegate_src.MergedTypeResolverOptions#valuesfromresults)

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

#### Defined in

[packages/delegate/src/types.ts:181](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L181)

---

### dataLoaderOptions

• `Optional` **dataLoaderOptions**: `Options`\<`K`, `V`, `K`>

#### Defined in

[packages/delegate/src/types.ts:183](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L183)

---

### fieldName

• `Optional` **fieldName**: `string`

#### Defined in

[packages/delegate/src/types.ts:179](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L179)

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

#### Defined in

[packages/delegate/src/types.ts:182](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L182)
