[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) /
RemoveObjectFieldDeprecations

# Class: RemoveObjectFieldDeprecations<TContext\>

[wrap/src](../modules/wrap_src).RemoveObjectFieldDeprecations

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RemoveObjectFieldDeprecationsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RemoveObjectFieldDeprecations#constructor)

### Methods

- [transformSchema](wrap_src.RemoveObjectFieldDeprecations#transformschema)

## Constructors

### constructor

• **new RemoveObjectFieldDeprecations**<`TContext`\>(`reason`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name     | Type                 |
| :------- | :------------------- |
| `reason` | `string` \| `RegExp` |

#### Defined in

[packages/wrap/src/transforms/RemoveObjectFieldDeprecations.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldDeprecations.ts#L15)

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

[packages/wrap/src/transforms/RemoveObjectFieldDeprecations.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldDeprecations.ts#L34)
