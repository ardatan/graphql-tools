[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) /
IDelegateRequestOptions

# Interface: IDelegateRequestOptions<TContext, TArgs\>

[delegate/src](../modules/delegate_src).IDelegateRequestOptions

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |
| `TArgs`    | `Record`\<`string`, `any`> |

## Hierarchy

- [`IDelegateToSchemaOptions`](delegate_src.IDelegateToSchemaOptions)\<`TContext`, `TArgs`>

  ↳ **`IDelegateRequestOptions`**

## Table of contents

### Properties

- [args](delegate_src.IDelegateRequestOptions#args)
- [context](delegate_src.IDelegateRequestOptions#context)
- [fieldName](delegate_src.IDelegateRequestOptions#fieldname)
- [fieldNodes](delegate_src.IDelegateRequestOptions#fieldnodes)
- [info](delegate_src.IDelegateRequestOptions#info)
- [onLocatedError](delegate_src.IDelegateRequestOptions#onlocatederror)
- [operation](delegate_src.IDelegateRequestOptions#operation)
- [operationName](delegate_src.IDelegateRequestOptions#operationname)
- [request](delegate_src.IDelegateRequestOptions#request)
- [returnType](delegate_src.IDelegateRequestOptions#returntype)
- [rootValue](delegate_src.IDelegateRequestOptions#rootvalue)
- [schema](delegate_src.IDelegateRequestOptions#schema)
- [selectionSet](delegate_src.IDelegateRequestOptions#selectionset)
- [skipTypeMerging](delegate_src.IDelegateRequestOptions#skiptypemerging)
- [transformedSchema](delegate_src.IDelegateRequestOptions#transformedschema)
- [transforms](delegate_src.IDelegateRequestOptions#transforms)
- [validateRequest](delegate_src.IDelegateRequestOptions#validaterequest)

## Properties

### args

• `Optional` **args**: `TArgs`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[args](delegate_src.IDelegateToSchemaOptions#args)

#### Defined in

[packages/delegate/src/types.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L72)

---

### context

• `Optional` **context**: `TContext`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[context](delegate_src.IDelegateToSchemaOptions#context)

#### Defined in

[packages/delegate/src/types.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L75)

---

### fieldName

• `Optional` **fieldName**: `string`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[fieldName](delegate_src.IDelegateToSchemaOptions#fieldname)

#### Defined in

[packages/delegate/src/types.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L69)

---

### fieldNodes

• `Optional` **fieldNodes**: readonly `FieldNode`[]

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[fieldNodes](delegate_src.IDelegateToSchemaOptions#fieldnodes)

#### Defined in

[packages/delegate/src/types.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L74)

---

### info

• **info**: `GraphQLResolveInfo`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[info](delegate_src.IDelegateToSchemaOptions#info)

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

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[onLocatedError](delegate_src.IDelegateToSchemaOptions#onlocatederror)

#### Defined in

[packages/delegate/src/types.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L71)

---

### operation

• `Optional` **operation**: `OperationTypeNode`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[operation](delegate_src.IDelegateToSchemaOptions#operation)

#### Defined in

[packages/delegate/src/types.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L68)

---

### operationName

• `Optional` **operationName**: `string`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[operationName](delegate_src.IDelegateToSchemaOptions#operationname)

#### Defined in

[packages/delegate/src/types.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L67)

---

### request

• **request**: [`ExecutionRequest`](utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Defined in

[packages/delegate/src/types.ts:88](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L88)

---

### returnType

• `Optional` **returnType**: `GraphQLOutputType`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[returnType](delegate_src.IDelegateToSchemaOptions#returntype)

#### Defined in

[packages/delegate/src/types.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L70)

---

### rootValue

• `Optional` **rootValue**: `any`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[rootValue](delegate_src.IDelegateToSchemaOptions#rootvalue)

#### Defined in

[packages/delegate/src/types.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L77)

---

### schema

• **schema**: `GraphQLSchema` \| [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`,
`any`, `TContext`>

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[schema](delegate_src.IDelegateToSchemaOptions#schema)

#### Defined in

[packages/delegate/src/types.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L66)

---

### selectionSet

• `Optional` **selectionSet**: `SelectionSetNode`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[selectionSet](delegate_src.IDelegateToSchemaOptions#selectionset)

#### Defined in

[packages/delegate/src/types.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L73)

---

### skipTypeMerging

• `Optional` **skipTypeMerging**: `boolean`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[skipTypeMerging](delegate_src.IDelegateToSchemaOptions#skiptypemerging)

#### Defined in

[packages/delegate/src/types.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L81)

---

### transformedSchema

• `Optional` **transformedSchema**: `GraphQLSchema`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[transformedSchema](delegate_src.IDelegateToSchemaOptions#transformedschema)

#### Defined in

[packages/delegate/src/types.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L79)

---

### transforms

• `Optional` **transforms**: [`Transform`](delegate_src.Transform)\<`any`, `TContext`>[]

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[transforms](delegate_src.IDelegateToSchemaOptions#transforms)

#### Defined in

[packages/delegate/src/types.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L78)

---

### validateRequest

• `Optional` **validateRequest**: `boolean`

#### Inherited from

[IDelegateToSchemaOptions](delegate_src.IDelegateToSchemaOptions).[validateRequest](delegate_src.IDelegateToSchemaOptions#validaterequest)

#### Defined in

[packages/delegate/src/types.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L80)
