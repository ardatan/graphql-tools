[graphql-tools-monorepo](../README) / [stitch/src](../modules/stitch_src) / MergeTypeCandidate

# Interface: MergeTypeCandidate<TContext\>

[stitch/src](../modules/stitch_src).MergeTypeCandidate

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [subschema](stitch_src.MergeTypeCandidate#subschema)
- [transformedSubschema](stitch_src.MergeTypeCandidate#transformedsubschema)
- [type](stitch_src.MergeTypeCandidate#type)

## Properties

### subschema

• `Optional` **subschema**: `GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L20)

---

### transformedSubschema

• `Optional` **transformedSubschema**:
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/stitch/src/types.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L21)

---

### type

• **type**: `GraphQLNamedType`

#### Defined in

[packages/stitch/src/types.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L19)
