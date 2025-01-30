[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / MergedTypeInfo

# Interface: MergedTypeInfo<TContext\>

[delegate/src](../modules/delegate_src).MergedTypeInfo

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [delegationPlanBuilder](delegate_src.MergedTypeInfo#delegationplanbuilder)
- [fieldSelectionSets](delegate_src.MergedTypeInfo#fieldselectionsets)
- [nonUniqueFields](delegate_src.MergedTypeInfo#nonuniquefields)
- [resolvers](delegate_src.MergedTypeInfo#resolvers)
- [selectionSet](delegate_src.MergedTypeInfo#selectionset)
- [selectionSets](delegate_src.MergedTypeInfo#selectionsets)
- [targetSubschemas](delegate_src.MergedTypeInfo#targetsubschemas)
- [typeMaps](delegate_src.MergedTypeInfo#typemaps)
- [typeName](delegate_src.MergedTypeInfo#typename)
- [uniqueFields](delegate_src.MergedTypeInfo#uniquefields)

## Properties

### delegationPlanBuilder

• **delegationPlanBuilder**:
[`DelegationPlanBuilder`](../modules/delegate_src#delegationplanbuilder)

#### Defined in

[packages/delegate/src/types.ts:132](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L132)

---

### fieldSelectionSets

• **fieldSelectionSets**: `Map`\<[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`,
`any`, `any`, `TContext`>, `Record`\<`string`, `SelectionSetNode`>>

#### Defined in

[packages/delegate/src/types.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L130)

---

### nonUniqueFields

• **nonUniqueFields**: `Record`\<`string`,
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>[]>

#### Defined in

[packages/delegate/src/types.ts:124](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L124)

---

### resolvers

• **resolvers**: `Map`\<[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`,
`any`, `TContext`>, [`MergedTypeResolver`](../modules/delegate_src#mergedtyperesolver)\<`TContext`>>

#### Defined in

[packages/delegate/src/types.ts:131](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L131)

---

### selectionSet

• `Optional` **selectionSet**: `SelectionSetNode`

#### Defined in

[packages/delegate/src/types.ts:118](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L118)

---

### selectionSets

• **selectionSets**: `Map`\<[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`,
`any`, `TContext`>, `SelectionSetNode`>

#### Defined in

[packages/delegate/src/types.ts:129](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L129)

---

### targetSubschemas

• **targetSubschemas**: `Map`\<[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`,
`any`, `any`, `TContext`>, [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`,
`any`, `TContext`>[]>

#### Defined in

[packages/delegate/src/types.ts:119](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L119)

---

### typeMaps

• **typeMaps**: `Map`\<`GraphQLSchema` \| [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`,
`any`, `any`, `TContext`>, `Record`\<`string`, `GraphQLNamedType`>>

#### Defined in

[packages/delegate/src/types.ts:125](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L125)

---

### typeName

• **typeName**: `string`

#### Defined in

[packages/delegate/src/types.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L117)

---

### uniqueFields

• **uniqueFields**: `Record`\<`string`,
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>>

#### Defined in

[packages/delegate/src/types.ts:123](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L123)
