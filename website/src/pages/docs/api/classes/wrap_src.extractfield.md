[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / ExtractField

# Class: ExtractField<TContext\>

[wrap/src](../modules/wrap_src).ExtractField

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`ExtractFieldTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.ExtractField#constructor)

### Methods

- [transformRequest](wrap_src.ExtractField#transformrequest)

## Constructors

### constructor

• **new ExtractField**<`TContext`\>(`«destructured»`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name             | Type       |
| :--------------- | :--------- |
| `«destructured»` | `Object`   |
| › `from`         | `string`[] |
| › `to`           | `string`[] |

#### Defined in

[packages/wrap/src/transforms/ExtractField.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtractField.ts#L13)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`, `_delegationContext`, `_transformationContext`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Parameters

| Name                     | Type                                                                                                                           |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `originalRequest`        | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |
| `_delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>                                        |
| `_transformationContext` | `ExtractFieldTransformationContext`                                                                                            |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/ExtractField.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtractField.ts#L18)
