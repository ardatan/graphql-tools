---
title: "IAddResolversToSchemaOptions"
description: "The IAddResolversToSchemaOptions interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/Interfaces.ts:190](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L190)

Configuration object for adding resolvers to a schema

## Properties

### defaultFieldResolver?

> `optional` **defaultFieldResolver?**: [`IFieldResolver`](/docs/api/utils/src/type-aliases/ifieldresolver)\<`any`, `any`, `Record`\<`string`, `any`\>, `any`\>

Defined in: [packages/utils/src/Interfaces.ts:202](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L202)

Override the default field resolver provided by `graphql-js`

***

### inheritResolversFromInterfaces?

> `optional` **inheritResolversFromInterfaces?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:211](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L211)

GraphQL object types that implement interfaces will inherit any missing
resolvers from their interface types defined in the `resolvers` object

***

### resolvers

> **resolvers**: [`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)

Defined in: [packages/utils/src/Interfaces.ts:198](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L198)

Object describing the field resolvers to add to the provided schema

***

### resolverValidationOptions?

> `optional` **resolverValidationOptions?**: [`IResolverValidationOptions`](/docs/api/utils/src/interfaces/iresolvervalidationoptions)

Defined in: [packages/utils/src/Interfaces.ts:206](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L206)

Additional options for validating the provided resolvers

***

### schema

> **schema**: `GraphQLSchema`

Defined in: [packages/utils/src/Interfaces.ts:194](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L194)

The schema to which to add resolvers

***

### updateResolversInPlace?

> `optional` **updateResolversInPlace?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:215](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L215)

Set to `true` to modify the existing schema instead of creating a new one
