[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / Transformer

# Class: Transformer<TContext\>

[delegate/src](../modules/delegate_src).Transformer

## Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

## Table of contents

### Constructors

- [constructor](delegate_src.Transformer#constructor)

### Methods

- [transformRequest](delegate_src.Transformer#transformrequest)
- [transformResult](delegate_src.Transformer#transformresult)

## Constructors

### constructor

• **new Transformer**<`TContext`\>(`context`)

#### Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

#### Parameters

| Name      | Type                                                                                    |
| :-------- | :-------------------------------------------------------------------------------------- |
| `context` | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |

#### Defined in

[packages/delegate/src/Transformer.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Transformer.ts#L16)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Parameters

| Name              | Type                                                                                                                           |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `originalRequest` | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Defined in

[packages/delegate/src/Transformer.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Transformer.ts#L29)

---

### transformResult

▸ **transformResult**(`originalResult`): `any`

#### Parameters

| Name             | Type                                                                               |
| :--------------- | :--------------------------------------------------------------------------------- |
| `originalResult` | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`> |

#### Returns

`any`

#### Defined in

[packages/delegate/src/Transformer.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/Transformer.ts#L53)
