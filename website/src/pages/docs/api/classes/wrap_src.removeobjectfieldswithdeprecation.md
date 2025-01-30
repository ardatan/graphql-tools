[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) /
RemoveObjectFieldsWithDeprecation

# Class: RemoveObjectFieldsWithDeprecation<TContext\>

[wrap/src](../modules/wrap_src).RemoveObjectFieldsWithDeprecation

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RemoveObjectFieldsWithDeprecationTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RemoveObjectFieldsWithDeprecation#constructor)

### Methods

- [transformSchema](wrap_src.RemoveObjectFieldsWithDeprecation#transformschema)

## Constructors

### constructor

• **new RemoveObjectFieldsWithDeprecation**<`TContext`\>(`reason`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                 |
| :------- | :------------------- |
| `reason` | `string` \| `RegExp` |

#### Defined in

[packages/wrap/src/transforms/RemoveObjectFieldsWithDeprecation.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldsWithDeprecation.ts#L13)

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

[packages/wrap/src/transforms/RemoveObjectFieldsWithDeprecation.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldsWithDeprecation.ts#L22)
