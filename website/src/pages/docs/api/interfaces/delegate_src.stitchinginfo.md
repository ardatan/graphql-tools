[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / StitchingInfo

# Interface: StitchingInfo<TContext\>

[delegate/src](../modules/delegate_src).StitchingInfo

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [dynamicSelectionSetsByField](delegate_src.StitchingInfo#dynamicselectionsetsbyfield)
- [fieldNodesByField](delegate_src.StitchingInfo#fieldnodesbyfield)
- [fieldNodesByType](delegate_src.StitchingInfo#fieldnodesbytype)
- [mergedTypes](delegate_src.StitchingInfo#mergedtypes)
- [subschemaMap](delegate_src.StitchingInfo#subschemamap)

## Properties

### dynamicSelectionSetsByField

• **dynamicSelectionSetsByField**: `Record`\<`string`, `Record`\<`string`, (`node`: `FieldNode`) =>
`SelectionSetNode`[]>>

#### Defined in

[packages/delegate/src/types.ts:209](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L209)

---

### fieldNodesByField

• **fieldNodesByField**: `Record`\<`string`, `Record`\<`string`, `FieldNode`[]>>

#### Defined in

[packages/delegate/src/types.ts:208](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L208)

---

### fieldNodesByType

• **fieldNodesByType**: `Record`\<`string`, `FieldNode`[]>

#### Defined in

[packages/delegate/src/types.ts:207](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L207)

---

### mergedTypes

• **mergedTypes**: `Record`\<`string`, [`MergedTypeInfo`](delegate_src.MergedTypeInfo)\<`TContext`>>

#### Defined in

[packages/delegate/src/types.ts:213](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L213)

---

### subschemaMap

• **subschemaMap**: `Map`\<`GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>,
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>>

#### Defined in

[packages/delegate/src/types.ts:203](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L203)
