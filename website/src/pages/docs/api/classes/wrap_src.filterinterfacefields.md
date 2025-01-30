[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / FilterInterfaceFields

# Class: FilterInterfaceFields<TContext\>

[wrap/src](../modules/wrap_src).FilterInterfaceFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`FilterInterfaceFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.FilterInterfaceFields#constructor)

### Methods

- [transformSchema](wrap_src.FilterInterfaceFields#transformschema)

## Constructors

### constructor

• **new FilterInterfaceFields**<`TContext`\>(`filter`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                                              |
| :------- | :------------------------------------------------ |
| `filter` | [`FieldFilter`](../modules/utils_src#fieldfilter) |

#### Defined in

[packages/wrap/src/transforms/FilterInterfaceFields.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInterfaceFields.ts#L13)

## Methods

### transformSchema

▸ **transformSchema**(`originalWrappingSchema`, `subschemaConfig`): `GraphQLSchema`

#### Parameters

| Name                     | Type                                                                                                     |
| :----------------------- | :------------------------------------------------------------------------------------------------------- |
| `originalWrappingSchema` | `GraphQLSchema`                                                                                          |
| `subschemaConfig`        | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |

#### Returns

`GraphQLSchema`

#### Implementation of

Transform.transformSchema

#### Defined in

[packages/wrap/src/transforms/FilterInterfaceFields.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInterfaceFields.ts#L20)
