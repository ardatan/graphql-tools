# @graphql-tools/federation

### Interfaces

- [GetSubschemasFromSupergraphSdlOpts](/docs/api/interfaces/federation_src.GetSubschemasFromSupergraphSdlOpts)

### Variables

- [SubgraphBaseSDL](federation_src#subgraphbasesdl)
- [SubgraphSDLQuery](federation_src#subgraphsdlquery)

### Functions

- [buildSubgraphSchema](federation_src#buildsubgraphschema)
- [federationSubschemaTransformer](federation_src#federationsubschematransformer)
- [filterInternalFieldsAndTypes](federation_src#filterinternalfieldsandtypes)
- [getArgsFromKeysForFederation](federation_src#getargsfromkeysforfederation)
- [getCacheKeyFnFromKey](federation_src#getcachekeyfnfromkey)
- [getKeyFnForFederation](federation_src#getkeyfnforfederation)
- [getKeyForFederation](federation_src#getkeyforfederation)
- [getNamedTypeNode](federation_src#getnamedtypenode)
- [getStitchedSchemaFromSupergraphSdl](federation_src#getstitchedschemafromsupergraphsdl)
- [getStitchedSchemaWithUrls](federation_src#getstitchedschemawithurls)
- [getSubschemaForFederationWithExecutor](federation_src#getsubschemaforfederationwithexecutor)
- [getSubschemaForFederationWithSchema](federation_src#getsubschemaforfederationwithschema)
- [getSubschemaForFederationWithTypeDefs](federation_src#getsubschemaforfederationwithtypedefs)
- [getSubschemaForFederationWithURL](federation_src#getsubschemaforfederationwithurl)
- [getSubschemasFromSupergraphSdl](federation_src#getsubschemasfromsupergraphsdl)

## Variables

### SubgraphBaseSDL

• `Const` **SubgraphBaseSDL**:
`"\n  scalar _Any\n  scalar _FieldSet\n  scalar link__Import\n\n  enum link__Purpose {\n    SECURITY\n    EXECUTION\n  }\n\n  type _Service {\n    sdl: String!\n  }\n\n  type Query {\n    _entities(representations: [_Any!]!): [_Entity]!\n    _service: _Service!\n  }\n\n  directive @external on FIELD_DEFINITION | OBJECT\n  directive @requires(fields: _FieldSet!) on FIELD_DEFINITION\n  directive @provides(fields: _FieldSet!) on FIELD_DEFINITION\n  directive @key(fields: _FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE\n  directive @link(\n    url: String!\n    as: String\n    for: link__Purpose\n    import: [link__Import]\n  ) repeatable on SCHEMA\n  directive @shareable repeatable on OBJECT | FIELD_DEFINITION\n  directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION\n  directive @tag(\n    name: String!\n  ) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION\n  directive @override(from: String!) on FIELD_DEFINITION\n  directive @composeDirective(name: String!) repeatable on SCHEMA\n\n  directive @extends on OBJECT | INTERFACE\n"`

#### Defined in

[packages/federation/src/subgraph.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/subgraph.ts#L13)

---

### SubgraphSDLQuery

• `Const` **SubgraphSDLQuery**: `"\n  query SubgraphSDL {\n    _service {\n      sdl\n    }\n  }\n"`

#### Defined in

[packages/federation/src/gateway.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/gateway.ts#L32)

## Functions

### buildSubgraphSchema

▸ **buildSubgraphSchema**<`TContext`\>(`optsOrModules`): `GraphQLSchema`

#### Type parameters

| Name       | Type  |
| :--------- | :---- |
| `TContext` | `any` |

#### Parameters

| Name            | Type                                                                                                                                                                                                                                                             |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `optsOrModules` | [`IExecutableSchemaDefinition`](/docs/api/interfaces/schema_src.IExecutableSchemaDefinition)\<`TContext`> \| `Pick`\<[`IExecutableSchemaDefinition`](/docs/api/interfaces/schema_src.IExecutableSchemaDefinition)\<`TContext`>, `"resolvers"` \| `"typeDefs"`>[] |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/federation/src/subgraph.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/subgraph.ts#L53)

---

### federationSubschemaTransformer

▸ **federationSubschemaTransformer**(`subschemaConfig`):
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>> \|
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>>[]

#### Parameters

| Name              | Type                                                                                                                     |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |

#### Returns

[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>> \|
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>>[]

#### Defined in

[packages/stitch/src/types.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L65)

---

### filterInternalFieldsAndTypes

▸ **filterInternalFieldsAndTypes**(`finalSchema`): `GraphQLSchema`

#### Parameters

| Name          | Type            |
| :------------ | :-------------- |
| `finalSchema` | `GraphQLSchema` |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/federation/src/utils.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/utils.ts#L43)

---

### getArgsFromKeysForFederation

▸ **getArgsFromKeysForFederation**(`representations`): `Object`

#### Parameters

| Name              | Type             |
| :---------------- | :--------------- |
| `representations` | readonly `any`[] |

#### Returns

`Object`

| Name              | Type             |
| :---------------- | :--------------- |
| `representations` | readonly `any`[] |

#### Defined in

[packages/federation/src/utils.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/utils.ts#L4)

---

### getCacheKeyFnFromKey

▸ **getCacheKeyFnFromKey**(`key`): (`root`: `any`) => `any`

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `key` | `string` |

#### Returns

`fn`

▸ (`root`): `any`

##### Parameters

| Name   | Type  |
| :----- | :---- |
| `root` | `any` |

##### Returns

`any`

#### Defined in

[packages/federation/src/utils.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/utils.ts#L29)

---

### getKeyFnForFederation

▸ **getKeyFnForFederation**(`typeName`, `keys`): (`root`: `any`) => `any`

#### Parameters

| Name       | Type       |
| :--------- | :--------- |
| `typeName` | `string`   |
| `keys`     | `string`[] |

#### Returns

`fn`

▸ (`root`): `any`

##### Parameters

| Name   | Type  |
| :----- | :---- |
| `root` | `any` |

##### Returns

`any`

#### Defined in

[packages/federation/src/utils.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/utils.ts#L12)

---

### getKeyForFederation

▸ **getKeyForFederation**<`TRoot`\>(`root`): `TRoot`

#### Type parameters

| Name    |
| :------ |
| `TRoot` |

#### Parameters

| Name   | Type    |
| :----- | :------ |
| `root` | `TRoot` |

#### Returns

`TRoot`

#### Defined in

[packages/federation/src/utils.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/utils.ts#L8)

---

### getNamedTypeNode

▸ **getNamedTypeNode**(`typeNode`): `NamedTypeNode`

#### Parameters

| Name       | Type       |
| :--------- | :--------- |
| `typeNode` | `TypeNode` |

#### Returns

`NamedTypeNode`

#### Defined in

[packages/federation/src/utils.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/utils.ts#L66)

---

### getStitchedSchemaFromSupergraphSdl

▸ **getStitchedSchemaFromSupergraphSdl**(`opts`): `GraphQLSchema`

#### Parameters

| Name   | Type                                                                                                           |
| :----- | :------------------------------------------------------------------------------------------------------------- |
| `opts` | [`GetSubschemasFromSupergraphSdlOpts`](/docs/api/interfaces/federation_src.GetSubschemasFromSupergraphSdlOpts) |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/federation/src/supergraph.ts:512](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/supergraph.ts#L512)

---

### getStitchedSchemaWithUrls

▸ **getStitchedSchemaWithUrls**(`configs`): `Promise`\<`GraphQLSchema`>

#### Parameters

| Name      | Type                                                                                   |
| :-------- | :------------------------------------------------------------------------------------- |
| `configs` | [`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)[] |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Defined in

[packages/federation/src/gateway.ts:209](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/gateway.ts#L209)

---

### getSubschemaForFederationWithExecutor

▸ **getSubschemaForFederationWithExecutor**(`executor`): `Promise`\<\{ `batch?`: `boolean` ;
`batchingOptions?`: [`BatchingOptions`](/docs/api/interfaces/delegate_src.BatchingOptions)\<`any`,
`any`, `any`> ; `createProxyingResolver?`:
[`CreateProxyingResolverFn`](delegate_src#createproxyingresolverfn)\<`Record`\<`string`, `any`>> ;
`executor`: [`Executor`](utils_src#executor) ; `merge?`: `Record`\<`string`,
[`MergedTypeConfig`](/docs/api/interfaces/delegate_src.MergedTypeConfig)\<`any`, `any`,
`Record`\<`string`, `any`>>> ; `rootValue?`: `any` ; `schema`: `GraphQLSchema` ; `transforms?`:
[`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`any`, `Record`\<`string`, `any`>>[] }>

#### Parameters

| Name       | Type                             |
| :--------- | :------------------------------- |
| `executor` | [`Executor`](utils_src#executor) |

#### Returns

`Promise`\<\{ `batch?`: `boolean` ; `batchingOptions?`:
[`BatchingOptions`](/docs/api/interfaces/delegate_src.BatchingOptions)\<`any`, `any`, `any`> ;
`createProxyingResolver?`:
[`CreateProxyingResolverFn`](delegate_src#createproxyingresolverfn)\<`Record`\<`string`, `any`>> ;
`executor`: [`Executor`](utils_src#executor) ; `merge?`: `Record`\<`string`,
[`MergedTypeConfig`](/docs/api/interfaces/delegate_src.MergedTypeConfig)\<`any`, `any`,
`Record`\<`string`, `any`>>> ; `rootValue?`: `any` ; `schema`: `GraphQLSchema` ; `transforms?`:
[`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`any`, `Record`\<`string`, `any`>>[] }>

#### Defined in

[packages/federation/src/gateway.ts:180](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/gateway.ts#L180)

---

### getSubschemaForFederationWithSchema

▸ **getSubschemaForFederationWithSchema**(`schema`): `Promise`\<\{ `batch?`: `boolean` ;
`batchingOptions?`: [`BatchingOptions`](/docs/api/interfaces/delegate_src.BatchingOptions)\<`any`,
`any`, `any`> ; `createProxyingResolver?`:
[`CreateProxyingResolverFn`](delegate_src#createproxyingresolverfn)\<`Record`\<`string`, `any`>> ;
`executor`: [`Executor`](utils_src#executor) ; `merge?`: `Record`\<`string`,
[`MergedTypeConfig`](/docs/api/interfaces/delegate_src.MergedTypeConfig)\<`any`, `any`,
`Record`\<`string`, `any`>>> ; `rootValue?`: `any` ; `schema`: `GraphQLSchema` ; `transforms?`:
[`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`any`, `Record`\<`string`, `any`>>[] }>

#### Parameters

| Name     | Type            |
| :------- | :-------------- |
| `schema` | `GraphQLSchema` |

#### Returns

`Promise`\<\{ `batch?`: `boolean` ; `batchingOptions?`:
[`BatchingOptions`](/docs/api/interfaces/delegate_src.BatchingOptions)\<`any`, `any`, `any`> ;
`createProxyingResolver?`:
[`CreateProxyingResolverFn`](delegate_src#createproxyingresolverfn)\<`Record`\<`string`, `any`>> ;
`executor`: [`Executor`](utils_src#executor) ; `merge?`: `Record`\<`string`,
[`MergedTypeConfig`](/docs/api/interfaces/delegate_src.MergedTypeConfig)\<`any`, `any`,
`Record`\<`string`, `any`>>> ; `rootValue?`: `any` ; `schema`: `GraphQLSchema` ; `transforms?`:
[`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`any`, `Record`\<`string`, `any`>>[] }>

#### Defined in

[packages/federation/src/gateway.ts:204](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/gateway.ts#L204)

---

### getSubschemaForFederationWithTypeDefs

▸ **getSubschemaForFederationWithTypeDefs**(`typeDefs`):
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)

#### Parameters

| Name       | Type           |
| :--------- | :------------- |
| `typeDefs` | `DocumentNode` |

#### Returns

[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)

#### Defined in

[packages/federation/src/gateway.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/gateway.ts#L51)

---

### getSubschemaForFederationWithURL

▸ **getSubschemaForFederationWithURL**(`config`):
`Promise`\<[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)>

#### Parameters

| Name     | Type                                                                                 |
| :------- | :----------------------------------------------------------------------------------- |
| `config` | [`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions) |

#### Returns

`Promise`\<[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)>

#### Defined in

[packages/federation/src/gateway.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/gateway.ts#L40)

---

### getSubschemasFromSupergraphSdl

▸ **getSubschemasFromSupergraphSdl**(`«destructured»`): `Map`\<`string`,
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>>>

#### Parameters

| Name             | Type                                                                                                           |
| :--------------- | :------------------------------------------------------------------------------------------------------------- |
| `«destructured»` | [`GetSubschemasFromSupergraphSdlOpts`](/docs/api/interfaces/federation_src.GetSubschemasFromSupergraphSdlOpts) |

#### Returns

`Map`\<`string`, [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`,
`any`, `any`, `Record`\<`string`, `any`>>>

#### Defined in

[packages/federation/src/supergraph.ts:35](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/supergraph.ts#L35)
