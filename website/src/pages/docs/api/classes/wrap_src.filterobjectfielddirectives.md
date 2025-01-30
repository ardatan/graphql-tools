[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / FilterObjectFieldDirectives

# Class: FilterObjectFieldDirectives<TContext\>

[wrap/src](../modules/wrap_src).FilterObjectFieldDirectives

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`FilterObjectFieldDirectivesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.FilterObjectFieldDirectives#constructor)

### Methods

- [transformSchema](wrap_src.FilterObjectFieldDirectives#transformschema)

## Constructors

### constructor

• **new FilterObjectFieldDirectives**<`TContext`\>(`filter`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                                                  |
| :------- | :---------------------------------------------------- |
| `filter` | (`dirName`: `string`, `dirValue`: `any`) => `boolean` |

#### Defined in

[packages/wrap/src/transforms/FilterObjectFieldDirectives.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterObjectFieldDirectives.ts#L13)

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

[packages/wrap/src/transforms/FilterObjectFieldDirectives.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterObjectFieldDirectives.ts#L17)
