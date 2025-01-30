# @graphql-tools/resolvers-composition

### Type Aliases

- [ResolversComposerMapping](resolvers_composition_src#resolverscomposermapping)
- [ResolversComposition](resolvers_composition_src#resolverscomposition)

## Type Aliases

### ResolversComposerMapping

Ƭ **ResolversComposerMapping**\<`Resolvers`>: \{ [TypeName in keyof Resolvers]?: \{ [FieldName in
keyof Resolvers[TypeName]]: Resolvers[TypeName][FieldName] extends GraphQLFieldResolver\<any, any> ?
ResolversComposition\<Resolvers[TypeName][FieldName]> \|
ResolversComposition\<Resolvers[TypeName][FieldName]>[] : ResolversComposition \|
ResolversComposition[] } } \| \{ `[path: string]`:
[`ResolversComposition`](resolvers_composition_src#resolverscomposition) \|
[`ResolversComposition`](resolvers_composition_src#resolverscomposition)[]; }

#### Type parameters

| Name        | Type                                                            |
| :---------- | :-------------------------------------------------------------- |
| `Resolvers` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

#### Defined in

[packages/resolvers-composition/src/resolvers-composition.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/resolvers-composition/src/resolvers-composition.ts#L11)

---

### ResolversComposition

Ƭ **ResolversComposition**\<`Resolver`>: (`next`: `Resolver`) => `Resolver`

#### Type parameters

| Name       | Type                                                                                         |
| :--------- | :------------------------------------------------------------------------------------------- |
| `Resolver` | extends `GraphQLFieldResolver`\<`any`, `any`, `any`> = `GraphQLFieldResolver`\<`any`, `any`> |

#### Type declaration

▸ (`next`): `Resolver`

##### Parameters

| Name   | Type       |
| :----- | :--------- |
| `next` | `Resolver` |

##### Returns

`Resolver`

#### Defined in

[packages/resolvers-composition/src/resolvers-composition.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/resolvers-composition/src/resolvers-composition.ts#L7)
