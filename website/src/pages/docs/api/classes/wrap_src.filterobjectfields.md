[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / FilterObjectFields

# Class: FilterObjectFields<TContext\>

[wrap/src](../modules/wrap_src).FilterObjectFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`FilterObjectFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.FilterObjectFields#constructor)

### Methods

- [transformSchema](wrap_src.FilterObjectFields#transformschema)

## Constructors

### constructor

• **new FilterObjectFields**<`TContext`\>(`filter`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                                                          |
| :------- | :------------------------------------------------------------ |
| `filter` | [`ObjectFieldFilter`](../modules/utils_src#objectfieldfilter) |

#### Defined in

[packages/wrap/src/transforms/FilterObjectFields.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterObjectFields.ts#L13)

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

[packages/wrap/src/transforms/FilterObjectFields.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterObjectFields.ts#L20)
