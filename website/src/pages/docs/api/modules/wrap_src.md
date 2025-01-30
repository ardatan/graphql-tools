# @graphql-tools/wrap

### Classes

- [ExtractField](/docs/api/classes/wrap_src.ExtractField)
- [FilterInputObjectFields](/docs/api/classes/wrap_src.FilterInputObjectFields)
- [FilterInterfaceFields](/docs/api/classes/wrap_src.FilterInterfaceFields)
- [FilterObjectFieldDirectives](/docs/api/classes/wrap_src.FilterObjectFieldDirectives)
- [FilterObjectFields](/docs/api/classes/wrap_src.FilterObjectFields)
- [FilterRootFields](/docs/api/classes/wrap_src.FilterRootFields)
- [FilterTypes](/docs/api/classes/wrap_src.FilterTypes)
- [HoistField](/docs/api/classes/wrap_src.HoistField)
- [MapFields](/docs/api/classes/wrap_src.MapFields)
- [MapLeafValues](/docs/api/classes/wrap_src.MapLeafValues)
- [PruneSchema](/docs/api/classes/wrap_src.PruneSchema)
- [RemoveObjectFieldDeprecations](/docs/api/classes/wrap_src.RemoveObjectFieldDeprecations)
- [RemoveObjectFieldDirectives](/docs/api/classes/wrap_src.RemoveObjectFieldDirectives)
- [RemoveObjectFieldsWithDeprecation](/docs/api/classes/wrap_src.RemoveObjectFieldsWithDeprecation)
- [RemoveObjectFieldsWithDirective](/docs/api/classes/wrap_src.RemoveObjectFieldsWithDirective)
- [RenameInputObjectFields](/docs/api/classes/wrap_src.RenameInputObjectFields)
- [RenameInterfaceFields](/docs/api/classes/wrap_src.RenameInterfaceFields)
- [RenameObjectFieldArguments](/docs/api/classes/wrap_src.RenameObjectFieldArguments)
- [RenameObjectFields](/docs/api/classes/wrap_src.RenameObjectFields)
- [RenameRootFields](/docs/api/classes/wrap_src.RenameRootFields)
- [RenameRootTypes](/docs/api/classes/wrap_src.RenameRootTypes)
- [RenameTypes](/docs/api/classes/wrap_src.RenameTypes)
- [TransformCompositeFields](/docs/api/classes/wrap_src.TransformCompositeFields)
- [TransformEnumValues](/docs/api/classes/wrap_src.TransformEnumValues)
- [TransformInputObjectFields](/docs/api/classes/wrap_src.TransformInputObjectFields)
- [TransformInterfaceFields](/docs/api/classes/wrap_src.TransformInterfaceFields)
- [TransformObjectFields](/docs/api/classes/wrap_src.TransformObjectFields)
- [TransformQuery](/docs/api/classes/wrap_src.TransformQuery)
- [TransformRootFields](/docs/api/classes/wrap_src.TransformRootFields)
- [WrapFields](/docs/api/classes/wrap_src.WrapFields)
- [WrapQuery](/docs/api/classes/wrap_src.WrapQuery)
- [WrapType](/docs/api/classes/wrap_src.WrapType)

### Type Aliases

- [DataTransformer](wrap_src#datatransformer)
- [EnumValueTransformer](wrap_src#enumvaluetransformer)
- [ErrorsTransformer](wrap_src#errorstransformer)
- [FieldNodeTransformer](wrap_src#fieldnodetransformer)
- [FieldTransformer](wrap_src#fieldtransformer)
- [InputFieldNodeTransformer](wrap_src#inputfieldnodetransformer)
- [InputFieldTransformer](wrap_src#inputfieldtransformer)
- [InputObjectNodeTransformer](wrap_src#inputobjectnodetransformer)
- [LeafValueTransformer](wrap_src#leafvaluetransformer)
- [ObjectValueTransformerMap](wrap_src#objectvaluetransformermap)
- [RootFieldTransformer](wrap_src#rootfieldtransformer)
- [SchemaFromExecutorOptions](wrap_src#schemafromexecutoroptions)

### Functions

- [defaultCreateProxyingResolver](wrap_src#defaultcreateproxyingresolver)
- [generateProxyingResolvers](wrap_src#generateproxyingresolvers)
- [schemaFromExecutor](wrap_src#schemafromexecutor)
- [wrapSchema](wrap_src#wrapschema)

## Type Aliases

### DataTransformer

Ƭ **DataTransformer**: (`value`: `any`, `transformationContext`: `Record`\<`string`, `any`>) =>
`any`

#### Type declaration

▸ (`value`, `transformationContext`): `any`

##### Parameters

| Name                    | Type                       |
| :---------------------- | :------------------------- |
| `value`                 | `any`                      |
| `transformationContext` | `Record`\<`string`, `any`> |

##### Returns

`any`

#### Defined in

[packages/wrap/src/types.ts:64](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L64)

---

### EnumValueTransformer

Ƭ **EnumValueTransformer**: (`typeName`: `string`, `externalValue`: `string`, `enumValueConfig`:
`GraphQLEnumValueConfig`) => [`Maybe`](utils_src#maybe)\<`GraphQLEnumValueConfig` \| [`string`,
`GraphQLEnumValueConfig`]>

#### Type declaration

▸ (`typeName`, `externalValue`, `enumValueConfig`):
[`Maybe`](utils_src#maybe)\<`GraphQLEnumValueConfig` \| [`string`, `GraphQLEnumValueConfig`]>

##### Parameters

| Name              | Type                     |
| :---------------- | :----------------------- |
| `typeName`        | `string`                 |
| `externalValue`   | `string`                 |
| `enumValueConfig` | `GraphQLEnumValueConfig` |

##### Returns

[`Maybe`](utils_src#maybe)\<`GraphQLEnumValueConfig` \| [`string`, `GraphQLEnumValueConfig`]>

#### Defined in

[packages/wrap/src/types.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L48)

---

### ErrorsTransformer

Ƭ **ErrorsTransformer**: (`errors`: `ReadonlyArray`\<`GraphQLError`> \| `undefined`,
`transformationContext`: `Record`\<`string`, `any`>) => `GraphQLError`[] \| `undefined`

#### Type declaration

▸ (`errors`, `transformationContext`): `GraphQLError`[] \| `undefined`

##### Parameters

| Name                    | Type                                            |
| :---------------------- | :---------------------------------------------- |
| `errors`                | `ReadonlyArray`\<`GraphQLError`> \| `undefined` |
| `transformationContext` | `Record`\<`string`, `any`>                      |

##### Returns

`GraphQLError`[] \| `undefined`

#### Defined in

[packages/wrap/src/types.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L68)

---

### FieldNodeTransformer

Ƭ **FieldNodeTransformer**: (`typeName`: `string`, `fieldName`: `string`, `fieldNode`: `FieldNode`,
`fragments`: `Record`\<`string`, `FragmentDefinitionNode`>, `transformationContext`:
`Record`\<`string`, `any`>) => [`Maybe`](utils_src#maybe)\<`SelectionNode` \| `SelectionNode`[]>

#### Type declaration

▸ (`typeName`, `fieldName`, `fieldNode`, `fragments`, `transformationContext`):
[`Maybe`](utils_src#maybe)\<`SelectionNode` \| `SelectionNode`[]>

##### Parameters

| Name                    | Type                                          |
| :---------------------- | :-------------------------------------------- |
| `typeName`              | `string`                                      |
| `fieldName`             | `string`                                      |
| `fieldNode`             | `FieldNode`                                   |
| `fragments`             | `Record`\<`string`, `FragmentDefinitionNode`> |
| `transformationContext` | `Record`\<`string`, `any`>                    |

##### Returns

[`Maybe`](utils_src#maybe)\<`SelectionNode` \| `SelectionNode`[]>

#### Defined in

[packages/wrap/src/types.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L54)

---

### FieldTransformer

Ƭ **FieldTransformer**\<`TContext`>: (`typeName`: `string`, `fieldName`: `string`, `fieldConfig`:
`GraphQLFieldConfig`\<`any`, `TContext`>) =>
[`Maybe`](utils_src#maybe)\<`GraphQLFieldConfig`\<`any`, `TContext`> \| [`string`,
`GraphQLFieldConfig`\<`any`, `TContext`>]>

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Type declaration

▸ (`typeName`, `fieldName`, `fieldConfig`): [`Maybe`](utils_src#maybe)\<`GraphQLFieldConfig`\<`any`,
`TContext`> \| [`string`, `GraphQLFieldConfig`\<`any`, `TContext`>]>

##### Parameters

| Name          | Type                                     |
| :------------ | :--------------------------------------- |
| `typeName`    | `string`                                 |
| `fieldName`   | `string`                                 |
| `fieldConfig` | `GraphQLFieldConfig`\<`any`, `TContext`> |

##### Returns

[`Maybe`](utils_src#maybe)\<`GraphQLFieldConfig`\<`any`, `TContext`> \| [`string`,
`GraphQLFieldConfig`\<`any`, `TContext`>]>

#### Defined in

[packages/wrap/src/types.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L36)

---

### InputFieldNodeTransformer

Ƭ **InputFieldNodeTransformer**: \<TContext>(`typeName`: `string`, `fieldName`: `string`,
`inputFieldNode`: `ObjectFieldNode`, `request`:
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest), `delegationContext?`:
[`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>) =>
`ObjectFieldNode` \| `ObjectFieldNode`[]

#### Type declaration

▸ <`TContext`\>(`typeName`, `fieldName`, `inputFieldNode`, `request`, `delegationContext?`):
`ObjectFieldNode` \| `ObjectFieldNode`[]

##### Type parameters

| Name       |
| :--------- |
| `TContext` |

##### Parameters

| Name                 | Type                                                                                    |
| :------------------- | :-------------------------------------------------------------------------------------- |
| `typeName`           | `string`                                                                                |
| `fieldName`          | `string`                                                                                |
| `inputFieldNode`     | `ObjectFieldNode`                                                                       |
| `request`            | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)                   |
| `delegationContext?` | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |

##### Returns

`ObjectFieldNode` \| `ObjectFieldNode`[]

#### Defined in

[packages/wrap/src/types.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L21)

---

### InputFieldTransformer

Ƭ **InputFieldTransformer**: (`typeName`: `string`, `fieldName`: `string`, `inputFieldConfig`:
`GraphQLInputFieldConfig`) => `GraphQLInputFieldConfig` \| [`string`, `GraphQLInputFieldConfig`] \|
`null` \| `undefined`

#### Type declaration

▸ (`typeName`, `fieldName`, `inputFieldConfig`): `GraphQLInputFieldConfig` \| [`string`,
`GraphQLInputFieldConfig`] \| `null` \| `undefined`

##### Parameters

| Name               | Type                      |
| :----------------- | :------------------------ |
| `typeName`         | `string`                  |
| `fieldName`        | `string`                  |
| `inputFieldConfig` | `GraphQLInputFieldConfig` |

##### Returns

`GraphQLInputFieldConfig` \| [`string`, `GraphQLInputFieldConfig`] \| `null` \| `undefined`

#### Defined in

[packages/wrap/src/types.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L15)

---

### InputObjectNodeTransformer

Ƭ **InputObjectNodeTransformer**: \<TContext>(`typeName`: `string`, `inputObjectNode`:
`ObjectValueNode`, `request`: [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest),
`delegationContext?`:
[`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>) =>
`ObjectValueNode` \| `undefined`

#### Type declaration

▸ <`TContext`\>(`typeName`, `inputObjectNode`, `request`, `delegationContext?`): `ObjectValueNode`
\| `undefined`

##### Type parameters

| Name       |
| :--------- |
| `TContext` |

##### Parameters

| Name                 | Type                                                                                    |
| :------------------- | :-------------------------------------------------------------------------------------- |
| `typeName`           | `string`                                                                                |
| `inputObjectNode`    | `ObjectValueNode`                                                                       |
| `request`            | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)                   |
| `delegationContext?` | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |

##### Returns

`ObjectValueNode` \| `undefined`

#### Defined in

[packages/wrap/src/types.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L29)

---

### LeafValueTransformer

Ƭ **LeafValueTransformer**: (`typeName`: `string`, `value`: `any`) => `any`

#### Type declaration

▸ (`typeName`, `value`): `any`

##### Parameters

| Name       | Type     |
| :--------- | :------- |
| `typeName` | `string` |
| `value`    | `any`    |

##### Returns

`any`

#### Defined in

[packages/wrap/src/types.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L62)

---

### ObjectValueTransformerMap

Ƭ **ObjectValueTransformerMap**: `Record`\<`string`, [`DataTransformer`](wrap_src#datatransformer)>

#### Defined in

[packages/wrap/src/types.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L66)

---

### RootFieldTransformer

Ƭ **RootFieldTransformer**\<`TContext`>: (`operation`: `"Query"` \| `"Mutation"` \|
`"Subscription"`, `fieldName`: `string`, `fieldConfig`: `GraphQLFieldConfig`\<`any`, `TContext`>) =>
[`Maybe`](utils_src#maybe)\<`GraphQLFieldConfig`\<`any`, `TContext`> \| [`string`,
`GraphQLFieldConfig`\<`any`, `TContext`>]>

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Type declaration

▸ (`operation`, `fieldName`, `fieldConfig`):
[`Maybe`](utils_src#maybe)\<`GraphQLFieldConfig`\<`any`, `TContext`> \| [`string`,
`GraphQLFieldConfig`\<`any`, `TContext`>]>

##### Parameters

| Name          | Type                                          |
| :------------ | :-------------------------------------------- |
| `operation`   | `"Query"` \| `"Mutation"` \| `"Subscription"` |
| `fieldName`   | `string`                                      |
| `fieldConfig` | `GraphQLFieldConfig`\<`any`, `TContext`>      |

##### Returns

[`Maybe`](utils_src#maybe)\<`GraphQLFieldConfig`\<`any`, `TContext`> \| [`string`,
`GraphQLFieldConfig`\<`any`, `TContext`>]>

#### Defined in

[packages/wrap/src/types.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L42)

---

### SchemaFromExecutorOptions

Ƭ **SchemaFromExecutorOptions**: `Partial`\<`IntrospectionOptions`> & `Parameters`\<typeof
`buildClientSchema`>[``1``] & `ParseOptions`

#### Defined in

[packages/wrap/src/introspect.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/introspect.ts#L46)

## Functions

### defaultCreateProxyingResolver

▸ **defaultCreateProxyingResolver**<`TContext`\>(`«destructured»`): `GraphQLFieldResolver`\<`any`,
`any`>

#### Type parameters

| Name       | Type                               |
| :--------- | :--------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> |

#### Parameters

| Name             | Type                                                                                                              |
| :--------------- | :---------------------------------------------------------------------------------------------------------------- |
| `«destructured»` | [`ICreateProxyingResolverOptions`](/docs/api/interfaces/delegate_src.ICreateProxyingResolverOptions)\<`TContext`> |

#### Returns

`GraphQLFieldResolver`\<`any`, `any`>

#### Defined in

[packages/wrap/src/generateProxyingResolvers.ts:89](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/generateProxyingResolvers.ts#L89)

---

### generateProxyingResolvers

▸ **generateProxyingResolvers**<`TContext`\>(`subschemaConfig`): `Record`\<`string`,
`Record`\<`string`, `GraphQLFieldResolver`\<`any`, `any`>>>

#### Type parameters

| Name       | Type                               |
| :--------- | :--------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> |

#### Parameters

| Name              | Type                                                                                                     |
| :---------------- | :------------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |

#### Returns

`Record`\<`string`, `Record`\<`string`, `GraphQLFieldResolver`\<`any`, `any`>>>

#### Defined in

[packages/wrap/src/generateProxyingResolvers.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/generateProxyingResolvers.ts#L13)

---

### schemaFromExecutor

▸ **schemaFromExecutor**(`executor`, `context?`, `options?`): `GraphQLSchema`

#### Parameters

| Name       | Type                                                                                   |
| :--------- | :------------------------------------------------------------------------------------- |
| `executor` | [`SyncExecutor`](utils_src#syncexecutor)                                               |
| `context?` | `Record`\<`string`, `any`>                                                             |
| `options?` | `Partial`\<`IntrospectionOptions`> & `GraphQLSchemaValidationOptions` & `ParseOptions` |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/wrap/src/introspect.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/introspect.ts#L50)

▸ **schemaFromExecutor**(`executor`, `context?`, `options?`): `Promise`\<`GraphQLSchema`>

#### Parameters

| Name       | Type                                                                                   |
| :--------- | :------------------------------------------------------------------------------------- |
| `executor` | [`AsyncExecutor`](utils_src#asyncexecutor)                                             |
| `context?` | `Record`\<`string`, `any`>                                                             |
| `options?` | `Partial`\<`IntrospectionOptions`> & `GraphQLSchemaValidationOptions` & `ParseOptions` |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Defined in

[packages/wrap/src/introspect.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/introspect.ts#L55)

▸ **schemaFromExecutor**(`executor`, `context?`, `options?`):
[`MaybePromise`](utils_src#maybepromise)\<`GraphQLSchema`>

#### Parameters

| Name       | Type                                                                                   |
| :--------- | :------------------------------------------------------------------------------------- |
| `executor` | [`Executor`](utils_src#executor)                                                       |
| `context?` | `Record`\<`string`, `any`>                                                             |
| `options?` | `Partial`\<`IntrospectionOptions`> & `GraphQLSchemaValidationOptions` & `ParseOptions` |

#### Returns

[`MaybePromise`](utils_src#maybepromise)\<`GraphQLSchema`>

#### Defined in

[packages/wrap/src/introspect.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/introspect.ts#L60)

---

### wrapSchema

▸ **wrapSchema**<`TConfig`\>(`subschemaConfig`): `GraphQLSchema`

#### Type parameters

| Name      | Type                                                            |
| :-------- | :-------------------------------------------------------------- |
| `TConfig` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

#### Parameters

| Name              | Type                                                                                                                                                                                                |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TConfig`> \| [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TConfig`> |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/wrap/src/wrapSchema.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/wrapSchema.ts#L17)
