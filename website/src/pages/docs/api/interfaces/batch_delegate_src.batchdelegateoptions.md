[graphql-tools-monorepo](../README) / [batch-delegate/src](../modules/batch_delegate_src) /
BatchDelegateOptions

# Interface: BatchDelegateOptions<TContext, K, V, C\>

[batch-delegate/src](../modules/batch_delegate_src).BatchDelegateOptions

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |
| `K`        | `any`                      |
| `V`        | `any`                      |
| `C`        | `K`                        |

## Hierarchy

- `Omit`\<[`IDelegateToSchemaOptions`](delegate_src.IDelegateToSchemaOptions)\<`TContext`>,
  `"args"`>

  ↳ **`BatchDelegateOptions`**

## Table of contents

### Properties

- [argsFromKeys](batch_delegate_src.BatchDelegateOptions#argsfromkeys)
- [context](batch_delegate_src.BatchDelegateOptions#context)
- [dataLoaderOptions](batch_delegate_src.BatchDelegateOptions#dataloaderoptions)
- [fieldName](batch_delegate_src.BatchDelegateOptions#fieldname)
- [fieldNodes](batch_delegate_src.BatchDelegateOptions#fieldnodes)
- [info](batch_delegate_src.BatchDelegateOptions#info)
- [key](batch_delegate_src.BatchDelegateOptions#key)
- [lazyOptionsFn](batch_delegate_src.BatchDelegateOptions#lazyoptionsfn)
- [onLocatedError](batch_delegate_src.BatchDelegateOptions#onlocatederror)
- [operation](batch_delegate_src.BatchDelegateOptions#operation)
- [operationName](batch_delegate_src.BatchDelegateOptions#operationname)
- [returnType](batch_delegate_src.BatchDelegateOptions#returntype)
- [rootValue](batch_delegate_src.BatchDelegateOptions#rootvalue)
- [schema](batch_delegate_src.BatchDelegateOptions#schema)
- [selectionSet](batch_delegate_src.BatchDelegateOptions#selectionset)
- [skipTypeMerging](batch_delegate_src.BatchDelegateOptions#skiptypemerging)
- [transformedSchema](batch_delegate_src.BatchDelegateOptions#transformedschema)
- [transforms](batch_delegate_src.BatchDelegateOptions#transforms)
- [validateRequest](batch_delegate_src.BatchDelegateOptions#validaterequest)
- [valuesFromResults](batch_delegate_src.BatchDelegateOptions#valuesfromresults)

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

[packages/batch-delegate/src/types.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L17)

---

### context

• `Optional` **context**: `TContext`

#### Inherited from

Omit.context

#### Defined in

[packages/delegate/src/types.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L75)

---

### dataLoaderOptions

• `Optional` **dataLoaderOptions**: `Options`\<`K`, `V`, `C`>

#### Defined in

[packages/batch-delegate/src/types.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L15)

---

### fieldName

• `Optional` **fieldName**: `string`

#### Inherited from

Omit.fieldName

#### Defined in

[packages/delegate/src/types.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L69)

---

### fieldNodes

• `Optional` **fieldNodes**: readonly `FieldNode`[]

#### Inherited from

Omit.fieldNodes

#### Defined in

[packages/delegate/src/types.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L74)

---

### info

• **info**: `GraphQLResolveInfo`

#### Inherited from

Omit.info

#### Defined in

[packages/delegate/src/types.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L76)

---

### key

• **key**: `K`

#### Defined in

[packages/batch-delegate/src/types.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L16)

---

### lazyOptionsFn

• `Optional` **lazyOptionsFn**:
[`BatchDelegateOptionsFn`](../modules/batch_delegate_src#batchdelegateoptionsfn)\<`TContext`, `K`>

#### Defined in

[packages/batch-delegate/src/types.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L19)

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

Omit.onLocatedError

#### Defined in

[packages/delegate/src/types.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L71)

---

### operation

• `Optional` **operation**: `OperationTypeNode`

#### Inherited from

Omit.operation

#### Defined in

[packages/delegate/src/types.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L68)

---

### operationName

• `Optional` **operationName**: `string`

#### Inherited from

Omit.operationName

#### Defined in

[packages/delegate/src/types.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L67)

---

### returnType

• `Optional` **returnType**: `GraphQLOutputType`

#### Inherited from

Omit.returnType

#### Defined in

[packages/delegate/src/types.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L70)

---

### rootValue

• `Optional` **rootValue**: `any`

#### Inherited from

Omit.rootValue

#### Defined in

[packages/delegate/src/types.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L77)

---

### schema

• **schema**: `GraphQLSchema` \| [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`,
`any`, `TContext`>

#### Inherited from

Omit.schema

#### Defined in

[packages/delegate/src/types.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L66)

---

### selectionSet

• `Optional` **selectionSet**: `SelectionSetNode`

#### Inherited from

Omit.selectionSet

#### Defined in

[packages/delegate/src/types.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L73)

---

### skipTypeMerging

• `Optional` **skipTypeMerging**: `boolean`

#### Inherited from

Omit.skipTypeMerging

#### Defined in

[packages/delegate/src/types.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L81)

---

### transformedSchema

• `Optional` **transformedSchema**: `GraphQLSchema`

#### Inherited from

Omit.transformedSchema

#### Defined in

[packages/delegate/src/types.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L79)

---

### transforms

• `Optional` **transforms**: [`Transform`](delegate_src.Transform)\<`any`, `TContext`>[]

#### Inherited from

Omit.transforms

#### Defined in

[packages/delegate/src/types.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L78)

---

### validateRequest

• `Optional` **validateRequest**: `boolean`

#### Inherited from

Omit.validateRequest

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

[packages/batch-delegate/src/types.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L18)
