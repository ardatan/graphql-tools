# @graphql-tools/batch-delegate

### Interfaces

- [BatchDelegateOptions](/docs/api/interfaces/batch_delegate_src.BatchDelegateOptions)
- [CreateBatchDelegateFnOptions](/docs/api/interfaces/batch_delegate_src.CreateBatchDelegateFnOptions)

### Type Aliases

- [BatchDelegateFn](batch_delegate_src#batchdelegatefn)
- [BatchDelegateOptionsFn](batch_delegate_src#batchdelegateoptionsfn)

### Functions

- [batchDelegateToSchema](batch_delegate_src#batchdelegatetoschema)
- [createBatchDelegateFn](batch_delegate_src#createbatchdelegatefn)

## Type Aliases

### BatchDelegateFn

Ƭ **BatchDelegateFn**\<`TContext`, `K`>: (`batchDelegateOptions`:
[`BatchDelegateOptions`](/docs/api/interfaces/batch_delegate_src.BatchDelegateOptions)\<`TContext`,
`K`>) => `any`

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |
| `K`        | `any`                      |

#### Type declaration

▸ (`batchDelegateOptions`): `any`

##### Parameters

| Name                   | Type                                                                                                     |
| :--------------------- | :------------------------------------------------------------------------------------------------------- |
| `batchDelegateOptions` | [`BatchDelegateOptions`](/docs/api/interfaces/batch_delegate_src.BatchDelegateOptions)\<`TContext`, `K`> |

##### Returns

`any`

#### Defined in

[packages/batch-delegate/src/types.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L4)

---

### BatchDelegateOptionsFn

Ƭ **BatchDelegateOptionsFn**\<`TContext`, `K`>: (`batchDelegateOptions`:
[`BatchDelegateOptions`](/docs/api/interfaces/batch_delegate_src.BatchDelegateOptions)\<`TContext`,
`K`>, `keys`: `ReadonlyArray`\<`K`>) =>
[`IDelegateToSchemaOptions`](/docs/api/interfaces/delegate_src.IDelegateToSchemaOptions)\<`TContext`>

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |
| `K`        | `any`                      |

#### Type declaration

▸ (`batchDelegateOptions`, `keys`):
[`IDelegateToSchemaOptions`](/docs/api/interfaces/delegate_src.IDelegateToSchemaOptions)\<`TContext`>

##### Parameters

| Name                   | Type                                                                                                     |
| :--------------------- | :------------------------------------------------------------------------------------------------------- |
| `batchDelegateOptions` | [`BatchDelegateOptions`](/docs/api/interfaces/batch_delegate_src.BatchDelegateOptions)\<`TContext`, `K`> |
| `keys`                 | `ReadonlyArray`\<`K`>                                                                                    |

##### Returns

[`IDelegateToSchemaOptions`](/docs/api/interfaces/delegate_src.IDelegateToSchemaOptions)\<`TContext`>

#### Defined in

[packages/batch-delegate/src/types.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/types.ts#L8)

## Functions

### batchDelegateToSchema

▸ **batchDelegateToSchema**<`TContext`\>(`options`): `any`

#### Type parameters

| Name       | Type  |
| :--------- | :---- |
| `TContext` | `any` |

#### Parameters

| Name      | Type                                                                                                                     |
| :-------- | :----------------------------------------------------------------------------------------------------------------------- |
| `options` | [`BatchDelegateOptions`](/docs/api/interfaces/batch_delegate_src.BatchDelegateOptions)\<`TContext`, `any`, `any`, `any`> |

#### Returns

`any`

#### Defined in

[packages/batch-delegate/src/batchDelegateToSchema.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/batchDelegateToSchema.ts#L4)

---

### createBatchDelegateFn

▸ **createBatchDelegateFn**<`K`, `V`, `C`\>(`optionsOrArgsFromKeys`, `lazyOptionsFn?`,
`dataLoaderOptions?`, `valuesFromResults?`):
[`BatchDelegateFn`](batch_delegate_src#batchdelegatefn)\<`K`>

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `K`  | `any` |
| `V`  | `any` |
| `C`  | `K`   |

#### Parameters

| Name                    | Type                                                                                                                                                                                                               |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `optionsOrArgsFromKeys` | [`CreateBatchDelegateFnOptions`](/docs/api/interfaces/batch_delegate_src.CreateBatchDelegateFnOptions)\<`Record`\<`string`, `any`>, `any`, `any`, `any`> \| (`keys`: readonly `K`[]) => `Record`\<`string`, `any`> |
| `lazyOptionsFn?`        | [`BatchDelegateOptionsFn`](batch_delegate_src#batchdelegateoptionsfn)                                                                                                                                              |
| `dataLoaderOptions?`    | `Options`\<`K`, `V`, `C`>                                                                                                                                                                                          |
| `valuesFromResults?`    | (`results`: `any`, `keys`: readonly `K`[]) => `V`[]                                                                                                                                                                |

#### Returns

[`BatchDelegateFn`](batch_delegate_src#batchdelegatefn)\<`K`>

#### Defined in

[packages/batch-delegate/src/createBatchDelegateFn.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/batch-delegate/src/createBatchDelegateFn.ts#L5)
