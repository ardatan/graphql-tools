[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / PruneSchema

# Class: PruneSchema<TContext\>

[wrap/src](../modules/wrap_src).PruneSchema

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`PruneTypesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.PruneSchema#constructor)

### Methods

- [transformSchema](wrap_src.PruneSchema#transformschema)

## Constructors

### constructor

• **new PruneSchema**<`TContext`\>(`options?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name      | Type                                                                      |
| :-------- | :------------------------------------------------------------------------ |
| `options` | [`PruneSchemaOptions`](/docs/api/interfaces/utils_src.PruneSchemaOptions) |

#### Defined in

[packages/wrap/src/transforms/PruneSchema.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/PruneSchema.ts#L12)

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

[packages/wrap/src/transforms/PruneSchema.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/PruneSchema.ts#L16)
