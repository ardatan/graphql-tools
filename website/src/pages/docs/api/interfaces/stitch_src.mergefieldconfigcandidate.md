[graphql-tools-monorepo](../README) / [stitch/src](../modules/stitch_src) /
MergeFieldConfigCandidate

# Interface: MergeFieldConfigCandidate<TContext\>

[stitch/src](../modules/stitch_src).MergeFieldConfigCandidate

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [fieldConfig](stitch_src.MergeFieldConfigCandidate#fieldconfig)
- [fieldName](stitch_src.MergeFieldConfigCandidate#fieldname)
- [subschema](stitch_src.MergeFieldConfigCandidate#subschema)
- [transformedSubschema](stitch_src.MergeFieldConfigCandidate#transformedsubschema)
- [type](stitch_src.MergeFieldConfigCandidate#type)

## Properties

### fieldConfig

• **fieldConfig**: `GraphQLFieldConfig`\<`any`, `TContext`, `any`>

#### Defined in

[packages/stitch/src/types.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L25)

---

### fieldName

• **fieldName**: `string`

#### Defined in

[packages/stitch/src/types.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L26)

---

### subschema

• `Optional` **subschema**: `GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L28)

---

### transformedSubschema

• `Optional` **transformedSubschema**:
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L29)

---

### type

• **type**: `GraphQLInterfaceType` \| `GraphQLObjectType`\<`any`, `any`>

#### Defined in

[packages/stitch/src/types.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L27)
