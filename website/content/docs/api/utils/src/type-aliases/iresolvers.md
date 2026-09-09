---
title: "IResolvers"
description: "The IResolvers type alias exported by @graphql-tools/utils."
---

> **IResolvers**\<`TSource`, `TContext`, `TArgs`, `TReturn`\> = `Record`\<`string`, [`ISchemaLevelResolver`](/docs/api/utils/src/type-aliases/ischemalevelresolver)\<`TSource`, `TContext`, `TArgs`, `TReturn`\> \| [`IObjectTypeResolver`](/docs/api/utils/src/type-aliases/iobjecttyperesolver)\<`TSource`, `TContext`\> \| [`IInterfaceTypeResolver`](/docs/api/utils/src/type-aliases/iinterfacetyperesolver)\<`TSource`, `TContext`\> \| [`IUnionTypeResolver`](/docs/api/utils/src/type-aliases/iuniontyperesolver) \| [`IScalarTypeResolver`](/docs/api/utils/src/type-aliases/iscalartyperesolver) \| [`IEnumTypeResolver`](/docs/api/utils/src/type-aliases/ienumtyperesolver) \| [`IInputObjectTypeResolver`](/docs/api/utils/src/type-aliases/iinputobjecttyperesolver)\>

Defined in: [packages/utils/src/Interfaces.ts:368](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L368)

## Type Parameters

### TSource

`TSource` = `any`

### TContext

`TContext` = `any`

### TArgs

`TArgs` = `Record`\<`string`, `any`\>

### TReturn

`TReturn` = `any`
