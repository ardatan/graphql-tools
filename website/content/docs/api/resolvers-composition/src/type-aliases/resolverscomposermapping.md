---
title: "ResolversComposerMapping"
description: "The ResolversComposerMapping type alias exported by @graphql-tools/resolvers-composition."
---

> **ResolversComposerMapping**\<`Resolvers`\> = \{ \[TypeName in keyof Resolvers\]?: \{ \[FieldName in keyof Resolvers\[TypeName\]\]: Resolvers\[TypeName\]\[FieldName\] extends GraphQLFieldResolver\<any, any\> ? ResolversComposition\<Resolvers\[TypeName\]\[FieldName\]\> \| ResolversComposition\<Resolvers\[TypeName\]\[FieldName\]\>\[\] : ResolversComposition \| ResolversComposition\[\] \} \} \| \{\[`path`: `string`\]: [`ResolversComposition`](/docs/api/resolvers-composition/src/type-aliases/resolverscomposition)\<`GraphQLFieldResolver`\<`any`, `any`\>\> \| [`ResolversComposition`](/docs/api/resolvers-composition/src/type-aliases/resolverscomposition)\<`GraphQLFieldResolver`\<`any`, `any`\>\>[]; \}

Defined in: [packages/resolvers-composition/src/resolvers-composition.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/resolvers-composition/src/resolvers-composition.ts#L11)

## Type Parameters

### Resolvers

`Resolvers` *extends* `Record`\<`string`, `any`\> = `Record`\<`string`, `any`\>
