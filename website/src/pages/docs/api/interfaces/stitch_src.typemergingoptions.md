[graphql-tools-monorepo](../README) / [stitch/src](../modules/stitch_src) / TypeMergingOptions

# Interface: TypeMergingOptions<TContext\>

[stitch/src](../modules/stitch_src).TypeMergingOptions

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [enumValueConfigMerger](stitch_src.TypeMergingOptions#enumvalueconfigmerger)
- [fieldConfigMerger](stitch_src.TypeMergingOptions#fieldconfigmerger)
- [inputFieldConfigMerger](stitch_src.TypeMergingOptions#inputfieldconfigmerger)
- [typeCandidateMerger](stitch_src.TypeMergingOptions#typecandidatemerger)
- [typeDescriptionsMerger](stitch_src.TypeMergingOptions#typedescriptionsmerger)
- [validationScopes](stitch_src.TypeMergingOptions#validationscopes)
- [validationSettings](stitch_src.TypeMergingOptions#validationsettings)

## Properties

### enumValueConfigMerger

• `Optional` **enumValueConfigMerger**: (`candidates`:
[`MergeEnumValueConfigCandidate`](stitch_src.MergeEnumValueConfigCandidate)\<`TContext`>[]) =>
`GraphQLEnumValueConfig`

#### Type declaration

▸ (`candidates`): `GraphQLEnumValueConfig`

##### Parameters

| Name         | Type                                                                                       |
| :----------- | :----------------------------------------------------------------------------------------- |
| `candidates` | [`MergeEnumValueConfigCandidate`](stitch_src.MergeEnumValueConfigCandidate)\<`TContext`>[] |

##### Returns

`GraphQLEnumValueConfig`

#### Defined in

[packages/stitch/src/types.ts:82](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L82)

---

### fieldConfigMerger

• `Optional` **fieldConfigMerger**: (`candidates`:
[`MergeFieldConfigCandidate`](stitch_src.MergeFieldConfigCandidate)\<`TContext`>[]) =>
`GraphQLFieldConfig`\<`any`, `TContext`, `any`>

#### Type declaration

▸ (`candidates`): `GraphQLFieldConfig`\<`any`, `TContext`, `any`>

##### Parameters

| Name         | Type                                                                               |
| :----------- | :--------------------------------------------------------------------------------- |
| `candidates` | [`MergeFieldConfigCandidate`](stitch_src.MergeFieldConfigCandidate)\<`TContext`>[] |

##### Returns

`GraphQLFieldConfig`\<`any`, `TContext`, `any`>

#### Defined in

[packages/stitch/src/types.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L76)

---

### inputFieldConfigMerger

• `Optional` **inputFieldConfigMerger**: (`candidates`:
[`MergeInputFieldConfigCandidate`](stitch_src.MergeInputFieldConfigCandidate)\<`TContext`>[]) =>
`GraphQLInputFieldConfig`

#### Type declaration

▸ (`candidates`): `GraphQLInputFieldConfig`

##### Parameters

| Name         | Type                                                                                         |
| :----------- | :------------------------------------------------------------------------------------------- |
| `candidates` | [`MergeInputFieldConfigCandidate`](stitch_src.MergeInputFieldConfigCandidate)\<`TContext`>[] |

##### Returns

`GraphQLInputFieldConfig`

#### Defined in

[packages/stitch/src/types.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L79)

---

### typeCandidateMerger

• `Optional` **typeCandidateMerger**: (`candidates`:
[`MergeTypeCandidate`](stitch_src.MergeTypeCandidate)\<`TContext`>[]) =>
[`MergeTypeCandidate`](stitch_src.MergeTypeCandidate)\<`TContext`>

#### Type declaration

▸ (`candidates`): [`MergeTypeCandidate`](stitch_src.MergeTypeCandidate)\<`TContext`>

##### Parameters

| Name         | Type                                                                 |
| :----------- | :------------------------------------------------------------------- |
| `candidates` | [`MergeTypeCandidate`](stitch_src.MergeTypeCandidate)\<`TContext`>[] |

##### Returns

[`MergeTypeCandidate`](stitch_src.MergeTypeCandidate)\<`TContext`>

#### Defined in

[packages/stitch/src/types.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L72)

---

### typeDescriptionsMerger

• `Optional` **typeDescriptionsMerger**: (`candidates`:
[`MergeTypeCandidate`](stitch_src.MergeTypeCandidate)\<`TContext`>[]) =>
[`Maybe`](../modules/utils_src#maybe)\<`string`>

#### Type declaration

▸ (`candidates`): [`Maybe`](../modules/utils_src#maybe)\<`string`>

##### Parameters

| Name         | Type                                                                 |
| :----------- | :------------------------------------------------------------------- |
| `candidates` | [`MergeTypeCandidate`](stitch_src.MergeTypeCandidate)\<`TContext`>[] |

##### Returns

[`Maybe`](../modules/utils_src#maybe)\<`string`>

#### Defined in

[packages/stitch/src/types.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L75)

---

### validationScopes

• `Optional` **validationScopes**: `Record`\<`string`,
[`ValidationSettings`](stitch_src.ValidationSettings)>

#### Defined in

[packages/stitch/src/types.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L71)

---

### validationSettings

• `Optional` **validationSettings**: [`ValidationSettings`](stitch_src.ValidationSettings)

#### Defined in

[packages/stitch/src/types.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L70)
