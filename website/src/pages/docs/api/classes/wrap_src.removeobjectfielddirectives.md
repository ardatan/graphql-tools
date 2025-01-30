[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / RemoveObjectFieldDirectives

# Class: RemoveObjectFieldDirectives<TContext\>

[wrap/src](../modules/wrap_src).RemoveObjectFieldDirectives

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RemoveObjectFieldDirectivesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RemoveObjectFieldDirectives#constructor)

### Methods

- [transformSchema](wrap_src.RemoveObjectFieldDirectives#transformschema)

## Constructors

### constructor

• **new RemoveObjectFieldDirectives**<`TContext`\>(`directiveName`, `args?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name            | Type                       |
| :-------------- | :------------------------- |
| `directiveName` | `string` \| `RegExp`       |
| `args`          | `Record`\<`string`, `any`> |

#### Defined in

[packages/wrap/src/transforms/RemoveObjectFieldDirectives.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldDirectives.ts#L13)

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

[packages/wrap/src/transforms/RemoveObjectFieldDirectives.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldDirectives.ts#L21)
