[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / DelegationContext

# Interface: DelegationContext<TContext\>

[delegate/src](../modules/delegate_src).DelegationContext

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [args](delegate_src.DelegationContext#args)
- [context](delegate_src.DelegationContext#context)
- [fieldName](delegate_src.DelegationContext#fieldname)
- [info](delegate_src.DelegationContext#info)
- [onLocatedError](delegate_src.DelegationContext#onlocatederror)
- [operation](delegate_src.DelegationContext#operation)
- [returnType](delegate_src.DelegationContext#returntype)
- [rootValue](delegate_src.DelegationContext#rootvalue)
- [skipTypeMerging](delegate_src.DelegationContext#skiptypemerging)
- [subschema](delegate_src.DelegationContext#subschema)
- [subschemaConfig](delegate_src.DelegationContext#subschemaconfig)
- [targetSchema](delegate_src.DelegationContext#targetschema)
- [transformedSchema](delegate_src.DelegationContext#transformedschema)
- [transforms](delegate_src.DelegationContext#transforms)

## Properties

### args

• `Optional` **args**: `Record`\<`string`, `any`>

#### Defined in

[packages/delegate/src/types.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L51)

---

### context

• `Optional` **context**: `TContext`

#### Defined in

[packages/delegate/src/types.ts:52](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L52)

---

### fieldName

• **fieldName**: `string`

#### Defined in

[packages/delegate/src/types.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L50)

---

### info

• `Optional` **info**: `GraphQLResolveInfo`

#### Defined in

[packages/delegate/src/types.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L53)

---

### onLocatedError

• `Optional` **onLocatedError**: (`originalError`: `GraphQLError`) => `GraphQLError`

#### Type declaration

▸ (`originalError`): `GraphQLError`

##### Parameters

| Name            | Type           |
| :-------------- | :------------- |
| `originalError` | `GraphQLError` |

##### Returns

`GraphQLError`

#### Defined in

[packages/delegate/src/types.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L55)

---

### operation

• **operation**: `OperationTypeNode`

#### Defined in

[packages/delegate/src/types.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L49)

---

### returnType

• **returnType**: `GraphQLOutputType`

#### Defined in

[packages/delegate/src/types.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L54)

---

### rootValue

• `Optional` **rootValue**: `any`

#### Defined in

[packages/delegate/src/types.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L56)

---

### skipTypeMerging

• **skipTypeMerging**: `boolean`

#### Defined in

[packages/delegate/src/types.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L59)

---

### subschema

• **subschema**: `GraphQLSchema` \| [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`,
`any`, `TContext`>

#### Defined in

[packages/delegate/src/types.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L46)

---

### subschemaConfig

• `Optional` **subschemaConfig**: [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`,
`any`, `TContext`>

#### Defined in

[packages/delegate/src/types.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L47)

---

### targetSchema

• **targetSchema**: `GraphQLSchema`

#### Defined in

[packages/delegate/src/types.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L48)

---

### transformedSchema

• **transformedSchema**: `GraphQLSchema`

#### Defined in

[packages/delegate/src/types.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L58)

---

### transforms

• **transforms**: [`Transform`](delegate_src.Transform)\<`any`, `TContext`>[]

#### Defined in

[packages/delegate/src/types.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L57)
