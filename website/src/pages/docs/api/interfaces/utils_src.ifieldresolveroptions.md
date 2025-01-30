[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / IFieldResolverOptions

# Interface: IFieldResolverOptions<TSource, TContext, TArgs\>

[utils/src](../modules/utils_src).IFieldResolverOptions

## Type parameters

| Name       | Type  |
| :--------- | :---- |
| `TSource`  | `any` |
| `TContext` | `any` |
| `TArgs`    | `any` |

## Table of contents

### Properties

- [args](utils_src.IFieldResolverOptions#args)
- [astNode](utils_src.IFieldResolverOptions#astnode)
- [deprecationReason](utils_src.IFieldResolverOptions#deprecationreason)
- [description](utils_src.IFieldResolverOptions#description)
- [extensions](utils_src.IFieldResolverOptions#extensions)
- [isDeprecated](utils_src.IFieldResolverOptions#isdeprecated)
- [name](utils_src.IFieldResolverOptions#name)
- [resolve](utils_src.IFieldResolverOptions#resolve)
- [selectionSet](utils_src.IFieldResolverOptions#selectionset)
- [subscribe](utils_src.IFieldResolverOptions#subscribe)
- [type](utils_src.IFieldResolverOptions#type)

## Properties

### args

• `Optional` **args**: `GraphQLArgument`[]

#### Defined in

[packages/utils/src/Interfaces.ts:195](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L195)

---

### astNode

• `Optional` **astNode**: `FieldDefinitionNode`

#### Defined in

[packages/utils/src/Interfaces.ts:201](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L201)

---

### deprecationReason

• `Optional` **deprecationReason**: `string`

#### Defined in

[packages/utils/src/Interfaces.ts:199](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L199)

---

### description

• `Optional` **description**: `string`

#### Defined in

[packages/utils/src/Interfaces.ts:193](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L193)

---

### extensions

• `Optional` **extensions**: `Record`\<`string`, `any`>

#### Defined in

[packages/utils/src/Interfaces.ts:200](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L200)

---

### isDeprecated

• `Optional` **isDeprecated**: `boolean`

#### Defined in

[packages/utils/src/Interfaces.ts:198](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L198)

---

### name

• `Optional` **name**: `string`

#### Defined in

[packages/utils/src/Interfaces.ts:192](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L192)

---

### resolve

• `Optional` **resolve**: [`IFieldResolver`](../modules/utils_src#ifieldresolver)\<`TSource`,
`TContext`, `TArgs`, `any`>

#### Defined in

[packages/utils/src/Interfaces.ts:196](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L196)

---

### selectionSet

• `Optional` **selectionSet**: `string` \| (`node`: `FieldNode`) => `SelectionSetNode`

#### Defined in

[packages/stitch/src/types.ts:116](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L116)

---

### subscribe

• `Optional` **subscribe**: [`IFieldResolver`](../modules/utils_src#ifieldresolver)\<`TSource`,
`TContext`, `TArgs`, `any`>

#### Defined in

[packages/utils/src/Interfaces.ts:197](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L197)

---

### type

• `Optional` **type**: `GraphQLOutputType`

#### Defined in

[packages/utils/src/Interfaces.ts:194](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L194)
