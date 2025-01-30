[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) /
IDelegateToSchemaOptions

# Interface: IDelegateToSchemaOptions<TContext, TArgs\>

[delegate/src](../modules/delegate_src).IDelegateToSchemaOptions

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |
| `TArgs`    | `Record`\<`string`, `any`> |

## Hierarchy

- **`IDelegateToSchemaOptions`**

  ↳ [`IDelegateRequestOptions`](delegate_src.IDelegateRequestOptions)

## Table of contents

### Properties

- [args](delegate_src.IDelegateToSchemaOptions#args)
- [context](delegate_src.IDelegateToSchemaOptions#context)
- [fieldName](delegate_src.IDelegateToSchemaOptions#fieldname)
- [fieldNodes](delegate_src.IDelegateToSchemaOptions#fieldnodes)
- [info](delegate_src.IDelegateToSchemaOptions#info)
- [onLocatedError](delegate_src.IDelegateToSchemaOptions#onlocatederror)
- [operation](delegate_src.IDelegateToSchemaOptions#operation)
- [operationName](delegate_src.IDelegateToSchemaOptions#operationname)
- [returnType](delegate_src.IDelegateToSchemaOptions#returntype)
- [rootValue](delegate_src.IDelegateToSchemaOptions#rootvalue)
- [schema](delegate_src.IDelegateToSchemaOptions#schema)
- [selectionSet](delegate_src.IDelegateToSchemaOptions#selectionset)
- [skipTypeMerging](delegate_src.IDelegateToSchemaOptions#skiptypemerging)
- [transformedSchema](delegate_src.IDelegateToSchemaOptions#transformedschema)
- [transforms](delegate_src.IDelegateToSchemaOptions#transforms)
- [validateRequest](delegate_src.IDelegateToSchemaOptions#validaterequest)

## Properties

### args

• `Optional` **args**: `TArgs`

#### Defined in

[packages/delegate/src/types.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L72)

---

### context

• `Optional` **context**: `TContext`

#### Defined in

[packages/delegate/src/types.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L75)

---

### fieldName

• `Optional` **fieldName**: `string`

#### Defined in

[packages/delegate/src/types.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L69)

---

### fieldNodes

• `Optional` **fieldNodes**: readonly `FieldNode`[]

#### Defined in

[packages/delegate/src/types.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L74)

---

### info

• **info**: `GraphQLResolveInfo`

#### Defined in

[packages/delegate/src/types.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L76)

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

[packages/delegate/src/types.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L71)

---

### operation

• `Optional` **operation**: `OperationTypeNode`

#### Defined in

[packages/delegate/src/types.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L68)

---

### operationName

• `Optional` **operationName**: `string`

#### Defined in

[packages/delegate/src/types.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L67)

---

### returnType

• `Optional` **returnType**: `GraphQLOutputType`

#### Defined in

[packages/delegate/src/types.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L70)

---

### rootValue

• `Optional` **rootValue**: `any`

#### Defined in

[packages/delegate/src/types.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L77)

---

### schema

• **schema**: `GraphQLSchema` \| [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`,
`any`, `TContext`>

#### Defined in

[packages/delegate/src/types.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L66)

---

### selectionSet

• `Optional` **selectionSet**: `SelectionSetNode`

#### Defined in

[packages/delegate/src/types.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L73)

---

### skipTypeMerging

• `Optional` **skipTypeMerging**: `boolean`

#### Defined in

[packages/delegate/src/types.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L81)

---

### transformedSchema

• `Optional` **transformedSchema**: `GraphQLSchema`

#### Defined in

[packages/delegate/src/types.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L79)

---

### transforms

• `Optional` **transforms**: [`Transform`](delegate_src.Transform)\<`any`, `TContext`>[]

#### Defined in

[packages/delegate/src/types.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L78)

---

### validateRequest

• `Optional` **validateRequest**: `boolean`

#### Defined in

[packages/delegate/src/types.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L80)
