[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / ExecutionRequest

# Interface: ExecutionRequest<TVariables, TContext, TRootValue, TExtensions, TReturn\>

[utils/src](../modules/utils_src).ExecutionRequest

## Type parameters

| Name          | Type                                       |
| :------------ | :----------------------------------------- |
| `TVariables`  | extends `Record`\<`string`, `any`> = `any` |
| `TContext`    | `any`                                      |
| `TRootValue`  | `any`                                      |
| `TExtensions` | `Record`\<`string`, `any`>                 |
| `TReturn`     | `any`                                      |

## Table of contents

### Properties

- [context](utils_src.ExecutionRequest#context)
- [document](utils_src.ExecutionRequest#document)
- [extensions](utils_src.ExecutionRequest#extensions)
- [info](utils_src.ExecutionRequest#info)
- [operationName](utils_src.ExecutionRequest#operationname)
- [operationType](utils_src.ExecutionRequest#operationtype)
- [rootValue](utils_src.ExecutionRequest#rootvalue)
- [variables](utils_src.ExecutionRequest#variables)

## Properties

### context

• `Optional` **context**: `TContext`

#### Defined in

[packages/utils/src/Interfaces.ts:87](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L87)

---

### document

• **document**: `TypedDocumentNode`\<`TReturn`, `TVariables`>

#### Defined in

[packages/utils/src/Interfaces.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L78)

---

### extensions

• `Optional` **extensions**: `TExtensions`

#### Defined in

[packages/utils/src/Interfaces.ts:83](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L83)

---

### info

• `Optional` **info**: `GraphQLResolveInfo`

#### Defined in

[packages/utils/src/Interfaces.ts:88](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L88)

---

### operationName

• `Optional` **operationName**: `string`

#### Defined in

[packages/utils/src/Interfaces.ts:82](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L82)

---

### operationType

• `Optional` **operationType**: `OperationTypeNode`

#### Defined in

[packages/utils/src/Interfaces.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L81)

---

### rootValue

• `Optional` **rootValue**: `TRootValue`

#### Defined in

[packages/utils/src/Interfaces.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L85)

---

### variables

• `Optional` **variables**: `TVariables`

#### Defined in

[packages/utils/src/Interfaces.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L79)
