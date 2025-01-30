# @graphql-tools/load

### Type Aliases

- [LoadSchemaOptions](load_src#loadschemaoptions)
- [LoadTypedefsOptions](load_src#loadtypedefsoptions)
- [UnnormalizedTypeDefPointer](load_src#unnormalizedtypedefpointer)

### Variables

- [NON_OPERATION_KINDS](load_src#non_operation_kinds)
- [OPERATION_KINDS](load_src#operation_kinds)

### Functions

- [filterKind](load_src#filterkind)
- [loadDocuments](load_src#loaddocuments)
- [loadDocumentsSync](load_src#loaddocumentssync)
- [loadSchema](load_src#loadschema)
- [loadSchemaSync](load_src#loadschemasync)
- [loadTypedefs](load_src#loadtypedefs)
- [loadTypedefsSync](load_src#loadtypedefssync)

## Type Aliases

### LoadSchemaOptions

Ƭ **LoadSchemaOptions**: `BuildSchemaOptions` &
[`LoadTypedefsOptions`](load_src#loadtypedefsoptions) &
`Partial`\<[`IExecutableSchemaDefinition`](/docs/api/interfaces/schema_src.IExecutableSchemaDefinition)>
& \{ `includeSources?`: `boolean` }

#### Defined in

[packages/load/src/schema.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L28)

---

### LoadTypedefsOptions

Ƭ **LoadTypedefsOptions**\<`ExtraConfig`>: [`BaseLoaderOptions`](utils_src#baseloaderoptions) &
`ExtraConfig` & \{ `cache?`: \{ `[key: string]`:
[`Source`](/docs/api/interfaces/utils_src.Source)[]; } ; `filterKinds?`: `string`[] ; `loaders`:
[`Loader`](/docs/api/interfaces/utils_src.Loader)[] ; `sort?`: `boolean` }

#### Type parameters

| Name          | Type                         |
| :------------ | :--------------------------- |
| `ExtraConfig` | \{ `[key: string]`: `any`; } |

#### Defined in

[packages/load/src/load-typedefs.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L11)

---

### UnnormalizedTypeDefPointer

Ƭ **UnnormalizedTypeDefPointer**: \{ `[key: string]`: `any`; } \| `string`

#### Defined in

[packages/load/src/load-typedefs.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L19)

## Variables

### NON_OPERATION_KINDS

• `Const` **NON_OPERATION_KINDS**: `KindList`

Kinds of AST nodes that are included in type system definition documents

#### Defined in

[packages/load/src/documents.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L20)

---

### OPERATION_KINDS

• `Const` **OPERATION_KINDS**: `KindList`

Kinds of AST nodes that are included in executable documents

#### Defined in

[packages/load/src/documents.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L15)

## Functions

### filterKind

▸ **filterKind**(`content`, `filterKinds`): `undefined` \| `DocumentNode`

#### Parameters

| Name          | Type                          |
| :------------ | :---------------------------- |
| `content`     | `undefined` \| `DocumentNode` |
| `filterKinds` | `null` \| `string`[]          |

#### Returns

`undefined` \| `DocumentNode`

#### Defined in

[packages/load/src/filter-document-kind.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/filter-document-kind.ts#L7)

---

### loadDocuments

▸ **loadDocuments**(`pointerOrPointers`, `options`):
`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

Asynchronously loads executable documents (i.e. operations and fragments) from the provided
pointers. The pointers may be individual files or a glob pattern. The files themselves may be
`.graphql` files or `.js` and `.ts` (in which case they will be parsed using graphql-tag-pluck).

#### Parameters

| Name                | Type                                                                                                                                         | Description                                      |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------- |
| `pointerOrPointers` | [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer)[] | Pointers to the files to load the documents from |
| `options`           | [`LoadTypedefsOptions`](load_src#loadtypedefsoptions)                                                                                        | Additional options                               |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Defined in

[packages/load/src/documents.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L32)

---

### loadDocumentsSync

▸ **loadDocumentsSync**(`pointerOrPointers`, `options`):
[`Source`](/docs/api/interfaces/utils_src.Source)[]

Synchronously loads executable documents (i.e. operations and fragments) from the provided pointers.
The pointers may be individual files or a glob pattern. The files themselves may be `.graphql` files
or `.js` and `.ts` (in which case they will be parsed using graphql-tag-pluck).

#### Parameters

| Name                | Type                                                                                                                                         | Description                                      |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------- |
| `pointerOrPointers` | [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer)[] | Pointers to the files to load the documents from |
| `options`           | [`LoadTypedefsOptions`](load_src#loadtypedefsoptions)                                                                                        | Additional options                               |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Defined in

[packages/load/src/documents.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/documents.ts#L51)

---

### loadSchema

▸ **loadSchema**(`schemaPointers`, `options`): `Promise`\<`GraphQLSchema`>

Asynchronously loads a schema from the provided pointers.

#### Parameters

| Name             | Type                                                                                                                                         | Description                                     |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| `schemaPointers` | [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer)[] | Pointers to the sources to load the schema from |
| `options`        | [`LoadSchemaOptions`](load_src#loadschemaoptions)                                                                                            | Additional options                              |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Defined in

[packages/load/src/schema.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L44)

---

### loadSchemaSync

▸ **loadSchemaSync**(`schemaPointers`, `options`): `GraphQLSchema`

Synchronously loads a schema from the provided pointers.

#### Parameters

| Name             | Type                                                                                                                                         | Description                                     |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| `schemaPointers` | [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer)[] | Pointers to the sources to load the schema from |
| `options`        | [`LoadSchemaOptions`](load_src#loadschemaoptions)                                                                                            | Additional options                              |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/load/src/schema.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/schema.ts#L60)

---

### loadTypedefs

▸ **loadTypedefs**<`AdditionalConfig`\>(`pointerOrPointers`, `options`):
`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

Asynchronously loads any GraphQL documents (i.e. executable documents like operations and fragments
as well as type system definitions) from the provided pointers. loadTypedefs does not merge the
typeDefs when `#import` is used (
https://github.com/ardatan/graphql-tools/issues/2980#issuecomment-1003692728 )

#### Type parameters

| Name               | Type                           |
| :----------------- | :----------------------------- |
| `AdditionalConfig` | `Record`\<`string`, `unknown`> |

#### Parameters

| Name                | Type                                                                                                                                         | Description                                        |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `pointerOrPointers` | [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer)[] | Pointers to the sources to load the documents from |
| `options`           | [`LoadTypedefsOptions`](load_src#loadtypedefsoptions)\<`Partial`\<`AdditionalConfig`>>                                                       | Additional options                                 |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Defined in

[packages/load/src/load-typedefs.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L29)

---

### loadTypedefsSync

▸ **loadTypedefsSync**<`AdditionalConfig`\>(`pointerOrPointers`, `options`):
[`Source`](/docs/api/interfaces/utils_src.Source)[]

Synchronously loads any GraphQL documents (i.e. executable documents like operations and fragments
as well as type system definitions) from the provided pointers.

#### Type parameters

| Name               | Type                           |
| :----------------- | :----------------------------- |
| `AdditionalConfig` | `Record`\<`string`, `unknown`> |

#### Parameters

| Name                | Type                                                                                                                                         | Description                                        |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `pointerOrPointers` | [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](load_src#unnormalizedtypedefpointer)[] | Pointers to the sources to load the documents from |
| `options`           | [`LoadTypedefsOptions`](load_src#loadtypedefsoptions)\<`Partial`\<`AdditionalConfig`>>                                                       | Additional options                                 |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Defined in

[packages/load/src/load-typedefs.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L84)
