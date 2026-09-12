---
title: "IMocks"
description: "The IMocks type alias exported by @graphql-tools/mock."
---

> **IMocks**\<`TResolvers`\> = \{ \[TTypeName in keyof TResolvers\]?: \{ \[TFieldName in keyof TResolvers\[TTypeName\]\]: TResolvers\[TTypeName\]\[TFieldName\] extends (args: any) =\> any ? () =\> ReturnType\<TResolvers\[TTypeName\]\[TFieldName\]\> \| ReturnType\<TResolvers\[TTypeName\]\[TFieldName\]\> : TResolvers\[TTypeName\]\[TFieldName\] \} \} & `object`

Defined in: [packages/mock/src/types.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L9)

## Type Parameters

### TResolvers

`TResolvers` = [`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)
