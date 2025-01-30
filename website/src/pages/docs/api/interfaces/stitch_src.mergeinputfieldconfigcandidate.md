[graphql-tools-monorepo](../README) / [stitch/src](../modules/stitch_src) /
MergeInputFieldConfigCandidate

# Interface: MergeInputFieldConfigCandidate<TContext\>

[stitch/src](../modules/stitch_src).MergeInputFieldConfigCandidate

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [fieldName](stitch_src.MergeInputFieldConfigCandidate#fieldname)
- [inputFieldConfig](stitch_src.MergeInputFieldConfigCandidate#inputfieldconfig)
- [subschema](stitch_src.MergeInputFieldConfigCandidate#subschema)
- [transformedSubschema](stitch_src.MergeInputFieldConfigCandidate#transformedsubschema)
- [type](stitch_src.MergeInputFieldConfigCandidate#type)

## Properties

### fieldName

• **fieldName**: `string`

#### Defined in

[packages/stitch/src/types.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L34)

---

### inputFieldConfig

• **inputFieldConfig**: `GraphQLInputFieldConfig`

#### Defined in

[packages/stitch/src/types.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L33)

---

### subschema

• `Optional` **subschema**: `GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L36)

---

### transformedSubschema

• `Optional` **transformedSubschema**:
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L37)

---

### type

• **type**: `GraphQLInputObjectType`

#### Defined in

[packages/stitch/src/types.ts:35](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L35)
