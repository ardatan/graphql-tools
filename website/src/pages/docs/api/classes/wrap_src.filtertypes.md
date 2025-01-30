[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / FilterTypes

# Class: FilterTypes<TContext\>

[wrap/src](../modules/wrap_src).FilterTypes

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`FilterTypesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.FilterTypes#constructor)

### Methods

- [transformSchema](wrap_src.FilterTypes#transformschema)

## Constructors

### constructor

• **new FilterTypes**<`TContext`\>(`filter`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                                      |
| :------- | :---------------------------------------- |
| `filter` | (`type`: `GraphQLNamedType`) => `boolean` |

#### Defined in

[packages/wrap/src/transforms/FilterTypes.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterTypes.ts#L12)

## Methods

### transformSchema

▸ **transformSchema**(`originalWrappingSchema`, `_subschemaConfig`): `GraphQLSchema`

#### Parameters

| Name                     | Type                                                                                                     |
| :----------------------- | :------------------------------------------------------------------------------------------------------- |
| `originalWrappingSchema` | `GraphQLSchema`                                                                                          |
| `_subschemaConfig`       | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |

#### Returns

`GraphQLSchema`

#### Implementation of

Transform.transformSchema

#### Defined in

[packages/wrap/src/transforms/FilterTypes.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterTypes.ts#L16)
