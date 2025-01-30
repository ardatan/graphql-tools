[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / ExternalObject

# Interface: ExternalObject<TContext\>

[delegate/src](../modules/delegate_src).ExternalObject

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Indexable

▪ [key: `string`]: `unknown`

## Table of contents

### Properties

- [[FIELD\_SUBSCHEMA\_MAP\_SYMBOL]](delegate_src.ExternalObject#[field_subschema_map_symbol])
- [[OBJECT\_SUBSCHEMA\_SYMBOL]](delegate_src.ExternalObject#[object_subschema_symbol])
- [[UNPATHED\_ERRORS\_SYMBOL]](delegate_src.ExternalObject#[unpathed_errors_symbol])
- [\_\_typename](delegate_src.ExternalObject#__typename)
- [key](delegate_src.ExternalObject#key)

## Properties

### [FIELD\_SUBSCHEMA\_MAP\_SYMBOL]

• **[FIELD\_SUBSCHEMA\_MAP\_SYMBOL]**: `Record`\<`string`, `GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>>

#### Defined in

[packages/delegate/src/types.ts:220](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L220)

---

### [OBJECT\_SUBSCHEMA\_SYMBOL]

• **[OBJECT\_SUBSCHEMA\_SYMBOL]**: `GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>

#### Defined in

[packages/delegate/src/types.ts:219](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L219)

---

### [UNPATHED\_ERRORS\_SYMBOL]

• **[UNPATHED\_ERRORS\_SYMBOL]**: `GraphQLError`[]

#### Defined in

[packages/delegate/src/types.ts:224](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L224)

---

### \_\_typename

• **\_\_typename**: `string`

#### Defined in

[packages/delegate/src/types.ts:217](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L217)

---

### key

• **key**: `any`

#### Defined in

[packages/delegate/src/types.ts:218](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L218)
