# @graphql-tools/relay-operation-optimizer

### Type Aliases

- [OptimizeDocumentsOptions](relay_operation_optimizer_src#optimizedocumentsoptions)

### Functions

- [optimizeDocuments](relay_operation_optimizer_src#optimizedocuments)

## Type Aliases

### OptimizeDocumentsOptions

Ƭ **OptimizeDocumentsOptions**:
[`SchemaPrintOptions`](/docs/api/interfaces/utils_src.SchemaPrintOptions) & `ParseOptions` & \{
`includeFragments?`: `boolean` }

#### Defined in

[packages/relay-operation-optimizer/src/index.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/relay-operation-optimizer/src/index.ts#L19)

## Functions

### optimizeDocuments

▸ **optimizeDocuments**(`schema`, `documents`, `options?`): `DocumentNode`[]

#### Parameters

| Name        | Type                                                                                 |
| :---------- | :----------------------------------------------------------------------------------- |
| `schema`    | `GraphQLSchema`                                                                      |
| `documents` | `DocumentNode`[]                                                                     |
| `options`   | [`OptimizeDocumentsOptions`](relay_operation_optimizer_src#optimizedocumentsoptions) |

#### Returns

`DocumentNode`[]

#### Defined in

[packages/relay-operation-optimizer/src/index.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/relay-operation-optimizer/src/index.ts#L24)
