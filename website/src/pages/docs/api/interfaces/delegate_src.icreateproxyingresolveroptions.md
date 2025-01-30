[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) /
ICreateProxyingResolverOptions

# Interface: ICreateProxyingResolverOptions<TContext\>

[delegate/src](../modules/delegate_src).ICreateProxyingResolverOptions

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Table of contents

### Properties

- [fieldName](delegate_src.ICreateProxyingResolverOptions#fieldname)
- [operation](delegate_src.ICreateProxyingResolverOptions#operation)
- [subschemaConfig](delegate_src.ICreateProxyingResolverOptions#subschemaconfig)

## Properties

### fieldName

• `Optional` **fieldName**: `string`

#### Defined in

[packages/delegate/src/types.ts:138](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L138)

---

### operation

• `Optional` **operation**: `OperationTypeNode`

#### Defined in

[packages/delegate/src/types.ts:137](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L137)

---

### subschemaConfig

• **subschemaConfig**: [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`>

#### Defined in

[packages/delegate/src/types.ts:136](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L136)
