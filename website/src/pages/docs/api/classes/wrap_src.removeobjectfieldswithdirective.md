[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) /
RemoveObjectFieldsWithDirective

# Class: RemoveObjectFieldsWithDirective<TContext\>

[wrap/src](../modules/wrap_src).RemoveObjectFieldsWithDirective

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RemoveObjectFieldsWithDirectiveTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RemoveObjectFieldsWithDirective#constructor)

### Methods

- [transformSchema](wrap_src.RemoveObjectFieldsWithDirective#transformschema)

## Constructors

### constructor

• **new RemoveObjectFieldsWithDirective**<`TContext`\>(`directiveName`, `args?`)

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

[packages/wrap/src/transforms/RemoveObjectFieldsWithDirective.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldsWithDirective.ts#L14)

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

[packages/wrap/src/transforms/RemoveObjectFieldsWithDirective.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RemoveObjectFieldsWithDirective.ts#L19)
