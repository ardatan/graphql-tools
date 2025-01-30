[graphql-tools-monorepo](../README) / [stitch/src](../modules/stitch_src) /
MergeEnumValueConfigCandidate

# Interface: MergeEnumValueConfigCandidate<TContext\>

[stitch/src](../modules/stitch_src).MergeEnumValueConfigCandidate

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [enumValue](stitch_src.MergeEnumValueConfigCandidate#enumvalue)
- [enumValueConfig](stitch_src.MergeEnumValueConfigCandidate#enumvalueconfig)
- [subschema](stitch_src.MergeEnumValueConfigCandidate#subschema)
- [transformedSubschema](stitch_src.MergeEnumValueConfigCandidate#transformedsubschema)
- [type](stitch_src.MergeEnumValueConfigCandidate#type)

## Properties

### enumValue

• **enumValue**: `string`

#### Defined in

[packages/stitch/src/types.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L42)

---

### enumValueConfig

• **enumValueConfig**: `GraphQLEnumValueConfig`

#### Defined in

[packages/stitch/src/types.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L41)

---

### subschema

• `Optional` **subschema**: `GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L44)

---

### transformedSubschema

• `Optional` **transformedSubschema**:
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:45](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L45)

---

### type

• **type**: `GraphQLEnumType`

#### Defined in

[packages/stitch/src/types.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L43)
