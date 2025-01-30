[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / TransformQuery

# Class: TransformQuery<TContext\>

[wrap/src](../modules/wrap_src).TransformQuery

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`TransformQueryTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.TransformQuery#constructor)

### Methods

- [transformRequest](wrap_src.TransformQuery#transformrequest)
- [transformResult](wrap_src.TransformQuery#transformresult)

## Constructors

### constructor

• **new TransformQuery**<`TContext`\>(`«destructured»`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                      | Type                                          |
| :------------------------ | :-------------------------------------------- |
| `«destructured»`          | `Object`                                      |
| › `errorPathTransformer?` | `ErrorPathTransformer`                        |
| › `fragments?`            | `Record`\<`string`, `FragmentDefinitionNode`> |
| › `path`                  | `string`[]                                    |
| › `queryTransformer`      | `QueryTransformer`                            |
| › `resultTransformer?`    | `ResultTransformer`                           |

#### Defined in

[packages/wrap/src/transforms/TransformQuery.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformQuery.ts#L31)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`, `delegationContext`, `transformationContext`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Parameters

| Name                    | Type                                                                                                                           |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `originalRequest`       | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>                                        |
| `transformationContext` | `TransformQueryTransformationContext`                                                                                          |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/TransformQuery.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformQuery.ts#L51)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `TransformQueryTransformationContext`                                                   |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/TransformQuery.ts:93](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformQuery.ts#L93)
