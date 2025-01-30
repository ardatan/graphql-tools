[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / Transform

# Interface: Transform<T, TContext\>

[delegate/src](../modules/delegate_src).Transform

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `T`        | `any`                      |
| `TContext` | `Record`\<`string`, `any`> |

## Implemented by

- [`ExtractField`](/docs/api/classes/wrap_src.ExtractField)
- [`FilterInputObjectFields`](/docs/api/classes/wrap_src.FilterInputObjectFields)
- [`FilterInterfaceFields`](/docs/api/classes/wrap_src.FilterInterfaceFields)
- [`FilterObjectFieldDirectives`](/docs/api/classes/wrap_src.FilterObjectFieldDirectives)
- [`FilterObjectFields`](/docs/api/classes/wrap_src.FilterObjectFields)
- [`FilterRootFields`](/docs/api/classes/wrap_src.FilterRootFields)
- [`FilterTypes`](/docs/api/classes/wrap_src.FilterTypes)
- [`HoistField`](/docs/api/classes/wrap_src.HoistField)
- [`MapFields`](/docs/api/classes/wrap_src.MapFields)
- [`MapLeafValues`](/docs/api/classes/wrap_src.MapLeafValues)
- [`PruneSchema`](/docs/api/classes/wrap_src.PruneSchema)
- [`RemoveObjectFieldDeprecations`](/docs/api/classes/wrap_src.RemoveObjectFieldDeprecations)
- [`RemoveObjectFieldDirectives`](/docs/api/classes/wrap_src.RemoveObjectFieldDirectives)
- [`RemoveObjectFieldsWithDeprecation`](/docs/api/classes/wrap_src.RemoveObjectFieldsWithDeprecation)
- [`RemoveObjectFieldsWithDirective`](/docs/api/classes/wrap_src.RemoveObjectFieldsWithDirective)
- [`RenameInputObjectFields`](/docs/api/classes/wrap_src.RenameInputObjectFields)
- [`RenameInterfaceFields`](/docs/api/classes/wrap_src.RenameInterfaceFields)
- [`RenameObjectFieldArguments`](/docs/api/classes/wrap_src.RenameObjectFieldArguments)
- [`RenameObjectFields`](/docs/api/classes/wrap_src.RenameObjectFields)
- [`RenameRootFields`](/docs/api/classes/wrap_src.RenameRootFields)
- [`RenameRootTypes`](/docs/api/classes/wrap_src.RenameRootTypes)
- [`RenameTypes`](/docs/api/classes/wrap_src.RenameTypes)
- [`TransformCompositeFields`](/docs/api/classes/wrap_src.TransformCompositeFields)
- [`TransformEnumValues`](/docs/api/classes/wrap_src.TransformEnumValues)
- [`TransformInputObjectFields`](/docs/api/classes/wrap_src.TransformInputObjectFields)
- [`TransformInterfaceFields`](/docs/api/classes/wrap_src.TransformInterfaceFields)
- [`TransformObjectFields`](/docs/api/classes/wrap_src.TransformObjectFields)
- [`TransformQuery`](/docs/api/classes/wrap_src.TransformQuery)
- [`TransformRootFields`](/docs/api/classes/wrap_src.TransformRootFields)
- [`WrapFields`](/docs/api/classes/wrap_src.WrapFields)
- [`WrapQuery`](/docs/api/classes/wrap_src.WrapQuery)
- [`WrapType`](/docs/api/classes/wrap_src.WrapType)

## Table of contents

### Properties

- [transformRequest](delegate_src.Transform#transformrequest)
- [transformResult](delegate_src.Transform#transformresult)
- [transformSchema](delegate_src.Transform#transformschema)

## Properties

### transformRequest

• `Optional` **transformRequest**:
[`RequestTransform`](../modules/delegate_src#requesttransform)\<`T`, `TContext`>

#### Defined in

[packages/delegate/src/types.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L41)

---

### transformResult

• `Optional` **transformResult**: [`ResultTransform`](../modules/delegate_src#resulttransform)\<`T`,
`TContext`>

#### Defined in

[packages/delegate/src/types.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L42)

---

### transformSchema

• `Optional` **transformSchema**:
[`SchemaTransform`](../modules/delegate_src#schematransform)\<`TContext`>

#### Defined in

[packages/delegate/src/types.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L40)
