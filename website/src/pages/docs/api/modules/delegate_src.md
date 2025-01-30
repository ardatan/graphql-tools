# @graphql-tools/delegate

### Classes

- [Subschema](/docs/api/classes/delegate_src.Subschema)
- [Transformer](/docs/api/classes/delegate_src.Transformer)

### Interfaces

- [BatchingOptions](/docs/api/interfaces/delegate_src.BatchingOptions)
- [DelegationContext](/docs/api/interfaces/delegate_src.DelegationContext)
- [ExternalObject](/docs/api/interfaces/delegate_src.ExternalObject)
- [ICreateProxyingResolverOptions](/docs/api/interfaces/delegate_src.ICreateProxyingResolverOptions)
- [ICreateRequest](/docs/api/interfaces/delegate_src.ICreateRequest)
- [IDelegateRequestOptions](/docs/api/interfaces/delegate_src.IDelegateRequestOptions)
- [IDelegateToSchemaOptions](/docs/api/interfaces/delegate_src.IDelegateToSchemaOptions)
- [MergedFieldConfig](/docs/api/interfaces/delegate_src.MergedFieldConfig)
- [MergedTypeConfig](/docs/api/interfaces/delegate_src.MergedTypeConfig)
- [MergedTypeEntryPoint](/docs/api/interfaces/delegate_src.MergedTypeEntryPoint)
- [MergedTypeInfo](/docs/api/interfaces/delegate_src.MergedTypeInfo)
- [MergedTypeResolverOptions](/docs/api/interfaces/delegate_src.MergedTypeResolverOptions)
- [StitchingInfo](/docs/api/interfaces/delegate_src.StitchingInfo)
- [SubschemaConfig](/docs/api/interfaces/delegate_src.SubschemaConfig)
- [Transform](/docs/api/interfaces/delegate_src.Transform)

### Type Aliases

- [CreateProxyingResolverFn](delegate_src#createproxyingresolverfn)
- [DelegationPlanBuilder](delegate_src#delegationplanbuilder)
- [MergedTypeResolver](delegate_src#mergedtyperesolver)
- [RequestTransform](delegate_src#requesttransform)
- [ResultTransform](delegate_src#resulttransform)
- [SchemaTransform](delegate_src#schematransform)

### Functions

- [annotateExternalObject](delegate_src#annotateexternalobject)
- [applySchemaTransforms](delegate_src#applyschematransforms)
- [cloneSubschemaConfig](delegate_src#clonesubschemaconfig)
- [createDefaultExecutor](delegate_src#createdefaultexecutor)
- [createRequest](delegate_src#createrequest)
- [defaultMergedResolver](delegate_src#defaultmergedresolver)
- [delegateRequest](delegate_src#delegaterequest)
- [delegateToSchema](delegate_src#delegatetoschema)
- [getActualFieldNodes](delegate_src#getactualfieldnodes)
- [getDelegatingOperation](delegate_src#getdelegatingoperation)
- [getSubschema](delegate_src#getsubschema)
- [getUnpathedErrors](delegate_src#getunpathederrors)
- [isExternalObject](delegate_src#isexternalobject)
- [isSubschema](delegate_src#issubschema)
- [isSubschemaConfig](delegate_src#issubschemaconfig)
- [mergeFields](delegate_src#mergefields)
- [resolveExternalValue](delegate_src#resolveexternalvalue)

## Type Aliases

### CreateProxyingResolverFn

Ƭ **CreateProxyingResolverFn**\<`TContext`>: (`options`:
[`ICreateProxyingResolverOptions`](/docs/api/interfaces/delegate_src.ICreateProxyingResolverOptions)\<`TContext`>)
=> `GraphQLFieldResolver`\<`any`, `TContext`>

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Type declaration

▸ (`options`): `GraphQLFieldResolver`\<`any`, `TContext`>

##### Parameters

| Name      | Type                                                                                                              |
| :-------- | :---------------------------------------------------------------------------------------------------------------- |
| `options` | [`ICreateProxyingResolverOptions`](/docs/api/interfaces/delegate_src.ICreateProxyingResolverOptions)\<`TContext`> |

##### Returns

`GraphQLFieldResolver`\<`any`, `TContext`>

#### Defined in

[packages/delegate/src/types.ts:141](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L141)

---

### DelegationPlanBuilder

Ƭ **DelegationPlanBuilder**: (`schema`: `GraphQLSchema`, `sourceSubschema`:
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `any`>,
`variableValues`: `Record`\<`string`, `any`>, `fragments`: `Record`\<`string`,
`FragmentDefinitionNode`>, `fieldNodes`: `FieldNode`[]) =>
`Map`\<[`Subschema`](/docs/api/classes/delegate_src.Subschema), `SelectionSetNode`>[]

#### Type declaration

▸ (`schema`, `sourceSubschema`, `variableValues`, `fragments`, `fieldNodes`):
`Map`\<[`Subschema`](/docs/api/classes/delegate_src.Subschema), `SelectionSetNode`>[]

##### Parameters

| Name              | Type                                                                                 |
| :---------------- | :----------------------------------------------------------------------------------- |
| `schema`          | `GraphQLSchema`                                                                      |
| `sourceSubschema` | [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `any`> |
| `variableValues`  | `Record`\<`string`, `any`>                                                           |
| `fragments`       | `Record`\<`string`, `FragmentDefinitionNode`>                                        |
| `fieldNodes`      | `FieldNode`[]                                                                        |

##### Returns

`Map`\<[`Subschema`](/docs/api/classes/delegate_src.Subschema), `SelectionSetNode`>[]

#### Defined in

[packages/delegate/src/types.ts:108](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L108)

---

### MergedTypeResolver

Ƭ **MergedTypeResolver**\<`TContext`>: (`originalResult`: `any`, `context`: `TContext`, `info`:
`GraphQLResolveInfo`, `subschema`: [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`,
`any`, `any`, `TContext`>, `selectionSet`: `SelectionSetNode`, `key`: `any` \| `undefined`, `type`:
`GraphQLOutputType`) => `any`

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Type declaration

▸ (`originalResult`, `context`, `info`, `subschema`, `selectionSet`, `key`, `type`): `any`

##### Parameters

| Name             | Type                                                                                      |
| :--------------- | :---------------------------------------------------------------------------------------- |
| `originalResult` | `any`                                                                                     |
| `context`        | `TContext`                                                                                |
| `info`           | `GraphQLResolveInfo`                                                                      |
| `subschema`      | [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`> |
| `selectionSet`   | `SelectionSetNode`                                                                        |
| `key`            | `any` \| `undefined`                                                                      |
| `type`           | `GraphQLOutputType`                                                                       |

##### Returns

`any`

#### Defined in

[packages/delegate/src/types.ts:192](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L192)

---

### RequestTransform

Ƭ **RequestTransform**\<`T`, `TContext`>: (`originalRequest`:
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest), `delegationContext`:
[`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>,
`transformationContext`: `T`) =>
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `T`        | `Record`\<`string`, `any`> |
| `TContext` | `Record`\<`any`, `string`> |

#### Type declaration

▸ (`originalRequest`, `delegationContext`, `transformationContext`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)

##### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalRequest`       | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)                   |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `T`                                                                                     |

##### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)

#### Defined in

[packages/delegate/src/types.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L28)

---

### ResultTransform

Ƭ **ResultTransform**\<`T`, `TContext`>: (`originalResult`:
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult), `delegationContext`:
[`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>,
`transformationContext`: `T`) => [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `T`        | `Record`\<`string`, `any`> |
| `TContext` | `Record`\<`any`, `string`> |

#### Type declaration

▸ (`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)

##### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)                     |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `T`                                                                                     |

##### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)

#### Defined in

[packages/delegate/src/types.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L33)

---

### SchemaTransform

Ƭ **SchemaTransform**\<`TContext`>: (`originalWrappingSchema`: `GraphQLSchema`, `subschemaConfig`:
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`>) => `GraphQLSchema`

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`any`, `string`> |

#### Type declaration

▸ (`originalWrappingSchema`, `subschemaConfig`): `GraphQLSchema`

##### Parameters

| Name                     | Type                                                                                                     |
| :----------------------- | :------------------------------------------------------------------------------------------------------- |
| `originalWrappingSchema` | `GraphQLSchema`                                                                                          |
| `subschemaConfig`        | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |

##### Returns

`GraphQLSchema`

#### Defined in

[packages/delegate/src/types.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L24)

## Functions

### annotateExternalObject

▸ **annotateExternalObject**<`TContext`\>(`object`, `errors`, `subschema`, `subschemaMap`):
[`ExternalObject`](/docs/api/interfaces/delegate_src.ExternalObject)

#### Type parameters

| Name       |
| :--------- |
| `TContext` |

#### Parameters

| Name           | Type                                                                                                                                                             |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `object`       | `any`                                                                                                                                                            |
| `errors`       | `GraphQLError`[]                                                                                                                                                 |
| `subschema`    | `undefined` \| `GraphQLSchema` \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>                       |
| `subschemaMap` | `Record`\<`string`, `GraphQLSchema` \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>>> |

#### Returns

[`ExternalObject`](/docs/api/interfaces/delegate_src.ExternalObject)

#### Defined in

[packages/delegate/src/mergeFields.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/mergeFields.ts#L30)

---

### applySchemaTransforms

▸ **applySchemaTransforms**(`originalWrappingSchema`, `subschemaConfig`): `GraphQLSchema`

#### Parameters

| Name                     | Type                                                                                                |
| :----------------------- | :-------------------------------------------------------------------------------------------------- |
| `originalWrappingSchema` | `GraphQLSchema`                                                                                     |
| `subschemaConfig`        | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `any`> |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/delegate/src/applySchemaTransforms.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/applySchemaTransforms.ts#L6)

---

### cloneSubschemaConfig

▸ **cloneSubschemaConfig**(`subschemaConfig`):
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)

#### Parameters

| Name              | Type                                                                                                                     |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |

#### Returns

[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)

#### Defined in

[packages/delegate/src/subschemaConfig.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/subschemaConfig.ts#L7)

---

### createDefaultExecutor

▸ **createDefaultExecutor**(`schema`): [`Executor`](utils_src#executor)

#### Parameters

| Name     | Type            |
| :------- | :-------------- |
| `schema` | `GraphQLSchema` |

#### Returns

[`Executor`](utils_src#executor)

#### Defined in

[packages/delegate/src/delegateToSchema.ts:237](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/delegateToSchema.ts#L237)

---

### createRequest

▸ **createRequest**(`«destructured»`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)

#### Parameters

| Name             | Type                                                                 |
| :--------------- | :------------------------------------------------------------------- |
| `«destructured»` | [`ICreateRequest`](/docs/api/interfaces/delegate_src.ICreateRequest) |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)

#### Defined in

[packages/delegate/src/createRequest.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/createRequest.ts#L40)

---

### defaultMergedResolver

▸ **defaultMergedResolver**(`parent`, `args`, `context`, `info`): `any`

Resolver that knows how to: a) handle aliases for proxied schemas b) handle errors from proxied
schemas c) handle external to internal enum conversion

#### Parameters

| Name      | Type                                                                                              |
| :-------- | :------------------------------------------------------------------------------------------------ |
| `parent`  | [`ExternalObject`](/docs/api/interfaces/delegate_src.ExternalObject)\<`Record`\<`string`, `any`>> |
| `args`    | `Record`\<`string`, `any`>                                                                        |
| `context` | `Record`\<`string`, `any`>                                                                        |
| `info`    | `GraphQLResolveInfo`                                                                              |

#### Returns

`any`

#### Defined in

[packages/delegate/src/defaultMergedResolver.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/defaultMergedResolver.ts#L13)

---

### delegateRequest

▸ **delegateRequest**<`TContext`, `TArgs`\>(`options`): `any`

#### Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |
| `TArgs`    | extends `Record`\<`string`, `any`> = `any`                      |

#### Parameters

| Name      | Type                                                                                                         |
| :-------- | :----------------------------------------------------------------------------------------------------------- |
| `options` | [`IDelegateRequestOptions`](/docs/api/interfaces/delegate_src.IDelegateRequestOptions)\<`TContext`, `TArgs`> |

#### Returns

`any`

#### Defined in

[packages/delegate/src/delegateToSchema.ts:89](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/delegateToSchema.ts#L89)

---

### delegateToSchema

▸ **delegateToSchema**<`TContext`, `TArgs`\>(`options`): `any`

#### Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |
| `TArgs`    | extends `Record`\<`string`, `any`> = `any`                      |

#### Parameters

| Name      | Type                                                                                                           |
| :-------- | :------------------------------------------------------------------------------------------------------------- |
| `options` | [`IDelegateToSchemaOptions`](/docs/api/interfaces/delegate_src.IDelegateToSchemaOptions)\<`TContext`, `TArgs`> |

#### Returns

`any`

#### Defined in

[packages/delegate/src/delegateToSchema.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/delegateToSchema.ts#L37)

---

### getActualFieldNodes

▸ **getActualFieldNodes**(`fieldNode`): `FieldNode`[]

#### Parameters

| Name        | Type        |
| :---------- | :---------- |
| `fieldNode` | `FieldNode` |

#### Returns

`FieldNode`[]

#### Defined in

[packages/delegate/src/mergeFields.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/mergeFields.ts#L58)

---

### getDelegatingOperation

▸ **getDelegatingOperation**(`parentType`, `schema`): `OperationTypeNode`

#### Parameters

| Name         | Type                               |
| :----------- | :--------------------------------- |
| `parentType` | `GraphQLObjectType`\<`any`, `any`> |
| `schema`     | `GraphQLSchema`                    |

#### Returns

`OperationTypeNode`

#### Defined in

[packages/delegate/src/createRequest.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/createRequest.ts#L27)

---

### getSubschema

▸ **getSubschema**(`object`, `responseKey`): `GraphQLSchema` \|
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)

#### Parameters

| Name          | Type                                                                                              |
| :------------ | :------------------------------------------------------------------------------------------------ |
| `object`      | [`ExternalObject`](/docs/api/interfaces/delegate_src.ExternalObject)\<`Record`\<`string`, `any`>> |
| `responseKey` | `string`                                                                                          |

#### Returns

`GraphQLSchema` \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)

#### Defined in

[packages/delegate/src/mergeFields.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/mergeFields.ts#L44)

---

### getUnpathedErrors

▸ **getUnpathedErrors**(`object`): `GraphQLError`[]

#### Parameters

| Name     | Type                                                                                              |
| :------- | :------------------------------------------------------------------------------------------------ |
| `object` | [`ExternalObject`](/docs/api/interfaces/delegate_src.ExternalObject)\<`Record`\<`string`, `any`>> |

#### Returns

`GraphQLError`[]

#### Defined in

[packages/delegate/src/mergeFields.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/mergeFields.ts#L51)

---

### isExternalObject

▸ **isExternalObject**(`data`): data is ExternalObject\<Record\<string, any>>

#### Parameters

| Name   | Type  |
| :----- | :---- |
| `data` | `any` |

#### Returns

data is ExternalObject\<Record\<string, any>>

#### Defined in

[packages/delegate/src/mergeFields.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/mergeFields.ts#L26)

---

### isSubschema

▸ **isSubschema**(`value`): value is Subschema\<any, any, any, Record\<string, any>>

#### Parameters

| Name    | Type  |
| :------ | :---- |
| `value` | `any` |

#### Returns

value is Subschema\<any, any, any, Record\<string, any>>

#### Defined in

[packages/delegate/src/Subschema.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Subschema.ts#L12)

---

### isSubschemaConfig

▸ **isSubschemaConfig**(`value`): value is SubschemaConfig\<any, any, any, any>

#### Parameters

| Name    | Type  |
| :------ | :---- |
| `value` | `any` |

#### Returns

value is SubschemaConfig\<any, any, any, any>

#### Defined in

[packages/delegate/src/subschemaConfig.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/subschemaConfig.ts#L3)

---

### mergeFields

▸ **mergeFields**<`TContext`\>(`mergedTypeInfo`, `object`, `sourceSubschema`, `context`, `info`):
[`MaybePromise`](utils_src#maybepromise)\<`any`>

#### Type parameters

| Name       |
| :--------- |
| `TContext` |

#### Parameters

| Name              | Type                                                                                              |
| :---------------- | :------------------------------------------------------------------------------------------------ |
| `mergedTypeInfo`  | [`MergedTypeInfo`](/docs/api/interfaces/delegate_src.MergedTypeInfo)\<`Record`\<`string`, `any`>> |
| `object`          | `any`                                                                                             |
| `sourceSubschema` | [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>         |
| `context`         | `any`                                                                                             |
| `info`            | `GraphQLResolveInfo`                                                                              |

#### Returns

[`MaybePromise`](utils_src#maybepromise)\<`any`>

#### Defined in

[packages/delegate/src/mergeFields.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/mergeFields.ts#L62)

---

### resolveExternalValue

▸ **resolveExternalValue**<`TContext`\>(`result`, `unpathedErrors`, `subschema`, `context?`,
`info?`, `returnType?`, `skipTypeMerging?`): `any`

#### Type parameters

| Name       | Type                               |
| :--------- | :--------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> |

#### Parameters

| Name               | Type                                                                                                                        |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `result`           | `any`                                                                                                                       |
| `unpathedErrors`   | `GraphQLError`[]                                                                                                            |
| `subschema`        | `GraphQLSchema` \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |
| `context?`         | `Record`\<`string`, `any`>                                                                                                  |
| `info?`            | `GraphQLResolveInfo`                                                                                                        |
| `returnType`       | `GraphQLOutputType`                                                                                                         |
| `skipTypeMerging?` | `boolean`                                                                                                                   |

#### Returns

`any`

#### Defined in

[packages/delegate/src/resolveExternalValue.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/resolveExternalValue.ts#L19)
