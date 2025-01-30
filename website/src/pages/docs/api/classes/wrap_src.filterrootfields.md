[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / FilterRootFields

# Class: FilterRootFields<TContext\>

[wrap/src](../modules/wrap_src).FilterRootFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`FilterRootFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.FilterRootFields#constructor)

### Methods

- [transformSchema](wrap_src.FilterRootFields#transformschema)

## Constructors

### constructor

• **new FilterRootFields**<`TContext`\>(`filter`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                                                      |
| :------- | :-------------------------------------------------------- |
| `filter` | [`RootFieldFilter`](../modules/utils_src#rootfieldfilter) |

#### Defined in

[packages/wrap/src/transforms/FilterRootFields.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterRootFields.ts#L13)

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

[packages/wrap/src/transforms/FilterRootFields.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterRootFields.ts#L29)
