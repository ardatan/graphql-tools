---
title: "IScalarTypeResolver"
description: "The IScalarTypeResolver type alias exported by @graphql-tools/utils."
---

> **IScalarTypeResolver** = `GraphQLScalarType` & `object`

Defined in: [packages/utils/src/Interfaces.ts:218](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L218)

## Type Declaration

### \_\_astNode?

> `optional` **\_\_astNode?**: `ScalarTypeDefinitionNode`

### \_\_description?

> `optional` **\_\_description?**: `string`

### \_\_extensionASTNodes?

> `optional` **\_\_extensionASTNodes?**: `ScalarTypeExtensionNode`[]

### \_\_extensions?

> `optional` **\_\_extensions?**: `Record`\<`string`, `any`\>

### \_\_name?

> `optional` **\_\_name?**: `string`

### \_\_parseLiteral?

> `optional` **\_\_parseLiteral?**: `GraphQLScalarLiteralParser`\<`any`\>

### \_\_parseValue?

> `optional` **\_\_parseValue?**: `GraphQLScalarValueParser`\<`any`\>

### \_\_serialize?

> `optional` **\_\_serialize?**: `GraphQLScalarSerializer`\<`any`\>
