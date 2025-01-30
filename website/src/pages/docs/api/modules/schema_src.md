# @graphql-tools/schema

### References

- [extractExtensionsFromSchema](schema_src#extractextensionsfromschema)

### Interfaces

- [GraphQLSchemaWithContext](/docs/api/interfaces/schema_src.GraphQLSchemaWithContext)
- [IExecutableSchemaDefinition](/docs/api/interfaces/schema_src.IExecutableSchemaDefinition)

### Type Aliases

- [MergeSchemasConfig](schema_src#mergeschemasconfig)

### Functions

- [addResolversToSchema](schema_src#addresolverstoschema)
- [assertResolversPresent](schema_src#assertresolverspresent)
- [chainResolvers](schema_src#chainresolvers)
- [checkForResolveTypeResolver](schema_src#checkforresolvetyperesolver)
- [extendResolversFromInterfaces](schema_src#extendresolversfrominterfaces)
- [makeExecutableSchema](schema_src#makeexecutableschema)
- [mergeSchemas](schema_src#mergeschemas)

## References

### extractExtensionsFromSchema

Re-exports [extractExtensionsFromSchema](merge_src#extractextensionsfromschema)

## Type Aliases

### MergeSchemasConfig

Ƭ **MergeSchemasConfig**\<`T`>:
`Partial`\<[`IExecutableSchemaDefinition`](/docs/api/interfaces/schema_src.IExecutableSchemaDefinition)\<`T`>>
& \{ `schemas?`: `GraphQLSchema`[] }

Configuration object for schema merging

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

#### Defined in

[packages/schema/src/merge-schemas.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/merge-schemas.ts#L16)

## Functions

### addResolversToSchema

▸ **addResolversToSchema**(`«destructured»`): `GraphQLSchema`

#### Parameters

| Name             | Type                                                                                          |
| :--------------- | :-------------------------------------------------------------------------------------------- |
| `«destructured»` | [`IAddResolversToSchemaOptions`](/docs/api/interfaces/utils_src.IAddResolversToSchemaOptions) |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/schema/src/addResolversToSchema.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/addResolversToSchema.ts#L32)

---

### assertResolversPresent

▸ **assertResolversPresent**(`schema`, `resolverValidationOptions?`): `void`

#### Parameters

| Name                        | Type                                                                                      |
| :-------------------------- | :---------------------------------------------------------------------------------------- |
| `schema`                    | `GraphQLSchema`                                                                           |
| `resolverValidationOptions` | [`IResolverValidationOptions`](/docs/api/interfaces/utils_src.IResolverValidationOptions) |

#### Returns

`void`

#### Defined in

[packages/schema/src/assertResolversPresent.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/assertResolversPresent.ts#L4)

---

### chainResolvers

▸ **chainResolvers**<`TArgs`\>(`resolvers`): (`root`: `any`, `args`: `TArgs`, `ctx`: `any`, `info`:
`GraphQLResolveInfo`) => `any`

#### Type parameters

| Name    | Type             |
| :------ | :--------------- |
| `TArgs` | extends `Object` |

#### Parameters

| Name        | Type                                                                          |
| :---------- | :---------------------------------------------------------------------------- |
| `resolvers` | [`Maybe`](utils_src#maybe)\<`GraphQLFieldResolver`\<`any`, `any`, `TArgs`>>[] |

#### Returns

`fn`

▸ (`root`, `args`, `ctx`, `info`): `any`

##### Parameters

| Name   | Type                 |
| :----- | :------------------- |
| `root` | `any`                |
| `args` | `TArgs`              |
| `ctx`  | `any`                |
| `info` | `GraphQLResolveInfo` |

##### Returns

`any`

#### Defined in

[packages/schema/src/chainResolvers.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/chainResolvers.ts#L4)

---

### checkForResolveTypeResolver

▸ **checkForResolveTypeResolver**(`schema`, `requireResolversForResolveType?`): `void`

#### Parameters

| Name                              | Type                                               |
| :-------------------------------- | :------------------------------------------------- |
| `schema`                          | `GraphQLSchema`                                    |
| `requireResolversForResolveType?` | [`ValidatorBehavior`](utils_src#validatorbehavior) |

#### Returns

`void`

#### Defined in

[packages/schema/src/checkForResolveTypeResolver.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/checkForResolveTypeResolver.ts#L5)

---

### extendResolversFromInterfaces

▸ **extendResolversFromInterfaces**(`schema`, `resolvers`): [`IResolvers`](utils_src#iresolvers)

#### Parameters

| Name        | Type                                 |
| :---------- | :----------------------------------- |
| `schema`    | `GraphQLSchema`                      |
| `resolvers` | [`IResolvers`](utils_src#iresolvers) |

#### Returns

[`IResolvers`](utils_src#iresolvers)

#### Defined in

[packages/schema/src/extendResolversFromInterfaces.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/extendResolversFromInterfaces.ts#L4)

---

### makeExecutableSchema

▸ **makeExecutableSchema**<`TContext`\>(`«destructured»`): `GraphQLSchema`

Builds a schema from the provided type definitions and resolvers.

The type definitions are written using Schema Definition Language (SDL). They can be provided as a
string, a `DocumentNode`, a function, or an array of any of these. If a function is provided, it
will be passed no arguments and should return an array of strings or `DocumentNode`s.

Note: You can use GraphQL magic comment provide additional syntax highlighting in your editor (with
the appropriate editor plugin).

```js
const typeDefs = /* GraphQL */ `
  type Query {
    posts: [Post]
    author(id: Int!): Author
  }
`
```

The `resolvers` object should be a map of type names to nested object, which themselves map the
type's fields to their appropriate resolvers. See the [Resolvers](/docs/resolvers) section of the
documentation for more details.

```js
const resolvers = {
  Query: {
    posts: (obj, args, ctx, info) => getAllPosts(),
    author: (obj, args, ctx, info) => getAuthorById(args.id)
  }
}
```

Once you've defined both the `typeDefs` and `resolvers`, you can create your schema:

```js
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})
```

#### Type parameters

| Name       | Type  |
| :--------- | :---- |
| `TContext` | `any` |

#### Parameters

| Name             | Type                                                                                                      |
| :--------------- | :-------------------------------------------------------------------------------------------------------- |
| `«destructured»` | [`IExecutableSchemaDefinition`](/docs/api/interfaces/schema_src.IExecutableSchemaDefinition)\<`TContext`> |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/schema/src/makeExecutableSchema.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/makeExecutableSchema.ts#L56)

---

### mergeSchemas

▸ **mergeSchemas**(`config`): `GraphQLSchema`

Synchronously merges multiple schemas, typeDefinitions and/or resolvers into a single schema.

#### Parameters

| Name     | Type                                                          | Description          |
| :------- | :------------------------------------------------------------ | :------------------- |
| `config` | [`MergeSchemasConfig`](schema_src#mergeschemasconfig)\<`any`> | Configuration object |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/schema/src/merge-schemas.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/merge-schemas.ts#L27)
