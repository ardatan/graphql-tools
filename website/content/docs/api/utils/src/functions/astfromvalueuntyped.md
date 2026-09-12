---
title: "astFromValueUntyped"
description: "The astFromValueUntyped function exported by @graphql-tools/utils."
---

> **astFromValueUntyped**(`value`): `ValueNode` \| `null`

Defined in: [packages/utils/src/astFromValueUntyped.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/astFromValueUntyped.ts#L19)

Produces a GraphQL Value AST given a JavaScript object.
Function will match JavaScript/JSON values to GraphQL AST schema format
by using the following mapping.

| JSON Value    | GraphQL Value        |
| ------------- | -------------------- |
| Object        | Input Object         |
| Array         | List                 |
| Boolean       | Boolean              |
| String        | String               |
| Number        | Int / Float          |
| BigInt        | Int                  |
| null          | NullValue            |

## Parameters

### value

`any`

## Returns

`ValueNode` \| `null`
