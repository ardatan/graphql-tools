[graphql-tools-monorepo](../README) / [batch-delegate/src](../modules/batch_delegate_src) /
CreateBatchDelegateFnOptions

# Interface: CreateBatchDelegateFnOptions<TContext, K, V, C\>

[batch-delegate/src](../modules/batch_delegate_src).CreateBatchDelegateFnOptions

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |
| `K`        | `any`                      |
| `V`        | `any`                      |
| `C`        | `K`                        |

## Hierarchy

- `Partial`\<`Omit`\<[`IDelegateToSchemaOptions`](delegate_src.IDelegateToSchemaOptions)\<`TContext`>,
  `"args"` \| `"info"`>>

  ↳ **`CreateBatchDelegateFnOptions`**

## Table of contents

### Properties

- [argsFromKeys](batch_delegate_src.CreateBatchDelegateFnOptions#argsfromkeys)
- [context](batch_delegate_src.CreateBatchDelegateFnOptions#context)
- [dataLoaderOptions](batch_delegate_src.CreateBatchDelegateFnOptions#dataloaderoptions)
- [fieldName](batch_delegate_src.CreateBatchDelegateFnOptions#fieldname)
- [fieldNodes](batch_delegate_src.CreateBatchDelegateFnOptions#fieldnodes)
- [lazyOptionsFn](batch_delegate_src.CreateBatchDelegateFnOptions#lazyoptionsfn)
- [onLocatedError](batch_delegate_src.CreateBatchDelegateFnOptions#onlocatederror)
- [operation](batch_delegate_src.CreateBatchDelegateFnOptions#operation)
- [operationName](batch_delegate_src.CreateBatchDelegateFnOptions#operationname)
- [returnType](batch_delegate_src.CreateBatchDelegateFnOptions#returntype)
- [rootValue](batch_delegate_src.CreateBatchDelegateFnOptions#rootvalue)
- [schema](batch_delegate_src.CreateBatchDelegateFnOptions#schema)
- [selectionSet](batch_delegate_src.CreateBatchDelegateFnOptions#selectionset)
- [skipTypeMerging](batch_delegate_src.CreateBatchDelegateFnOptions#skiptypemerging)
- [transformedSchema](batch_delegate_src.CreateBatchDelegateFnOptions#transformedschema)
- [transforms](batch_delegate_src.CreateBatchDelegateFnOptions#transforms)
- [validateRequest](batch_delegate_src.CreateBatchDelegateFnOptions#validaterequest)
- [valuesFromResults](batch_delegate_src.CreateBatchDelegateFnOptions#valuesfromresults)

## Properties

### argsFromKeys

• `Optional` **argsFromKeys**: (`keys`: readonly `K`[]) => `Record`\<`string`, `any`>

#### Type declaration

▸ (`keys`): `Record`\<`string`, `any`>

##### Parameters

| Name   | Type           |
| :----- | :------------- |
| `keys` | readonly `K`[] |

##### Returns

`Record`\<`string`, `any`>

#### Defined in

[packages/batch-delegate/src/types.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L29)

---

### context

• `Optional` **context**: `TContext`

#### Inherited from

Partial.context

#### Defined in

[packages/delegate/src/types.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L75)

---

### dataLoaderOptions

• `Optional` **dataLoaderOptions**: `Options`\<`K`, `V`, `C`>

#### Defined in

[packages/batch-delegate/src/types.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L28)

---

### fieldName

• `Optional` **fieldName**: `string`

#### Inherited from

Partial.fieldName

#### Defined in

[packages/delegate/src/types.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L69)

---

### fieldNodes

• `Optional` **fieldNodes**: readonly `FieldNode`[]

#### Inherited from

Partial.fieldNodes

#### Defined in

[packages/delegate/src/types.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L74)

---

### lazyOptionsFn

• `Optional` **lazyOptionsFn**:
[`BatchDelegateOptionsFn`](../modules/batch_delegate_src#batchdelegateoptionsfn)\<`TContext`, `K`>

#### Defined in

[packages/batch-delegate/src/types.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L31)

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

Partial.onLocatedError

#### Defined in

[packages/delegate/src/types.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L71)

---

### operation

• `Optional` **operation**: `OperationTypeNode`

#### Inherited from

Partial.operation

#### Defined in

[packages/delegate/src/types.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L68)

---

### operationName

• `Optional` **operationName**: `string`

#### Inherited from

Partial.operationName

#### Defined in

[packages/delegate/src/types.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L67)

---

### returnType

• `Optional` **returnType**: `GraphQLOutputType`

#### Inherited from

Partial.returnType

#### Defined in

[packages/delegate/src/types.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L70)

---

### rootValue

• `Optional` **rootValue**: `any`

#### Inherited from

Partial.rootValue

#### Defined in

[packages/delegate/src/types.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L77)

---

### schema

• `Optional` **schema**: `GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>

#### Inherited from

Partial.schema

#### Defined in

[packages/delegate/src/types.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L66)

---

### selectionSet

• `Optional` **selectionSet**: `SelectionSetNode`

#### Inherited from

Partial.selectionSet

#### Defined in

[packages/delegate/src/types.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L73)

---

### skipTypeMerging

• `Optional` **skipTypeMerging**: `boolean`

#### Inherited from

Partial.skipTypeMerging

#### Defined in

[packages/delegate/src/types.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L81)

---

### transformedSchema

• `Optional` **transformedSchema**: `GraphQLSchema`

#### Inherited from

Partial.transformedSchema

#### Defined in

[packages/delegate/src/types.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L79)

---

### transforms

• `Optional` **transforms**: [`Transform`](delegate_src.Transform)\<`any`, `TContext`>[]

#### Inherited from

Partial.transforms

#### Defined in

[packages/delegate/src/types.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L78)

---

### validateRequest

• `Optional` **validateRequest**: `boolean`

#### Inherited from

Partial.validateRequest

#### Defined in

[packages/delegate/src/types.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L80)

---

### valuesFromResults

• `Optional` **valuesFromResults**: (`results`: `any`, `keys`: readonly `K`[]) => `V`[]

#### Type declaration

▸ (`results`, `keys`): `V`[]

##### Parameters

| Name      | Type           |
| :-------- | :------------- |
| `results` | `any`          |
| `keys`    | readonly `K`[] |

##### Returns

`V`[]

#### Defined in

[packages/batch-delegate/src/types.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L30)
