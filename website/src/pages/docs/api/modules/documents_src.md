# @graphql-tools/documents

### Functions

- [printExecutableGraphQLDocument](documents_src#printexecutablegraphqldocument)
- [sortExecutableDocument](documents_src#sortexecutabledocument)

## Functions

### printExecutableGraphQLDocument

▸ **printExecutableGraphQLDocument**(`document`): `string`

Print an executable document node definition in a stable way. All the nodes are sorted by name and
the white space is reduced.

#### Parameters

| Name       | Type           |
| :--------- | :------------- |
| `document` | `DocumentNode` |

#### Returns

`string`

#### Defined in

[packages/documents/src/print-executable-graphql-document.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/documents/src/print-executable-graphql-document.ts#L9)

---

### sortExecutableDocument

▸ **sortExecutableDocument**(`document`): `DocumentNode`

Sort an executable GraphQL document.

#### Parameters

| Name       | Type           |
| :--------- | :------------- |
| `document` | `DocumentNode` |

#### Returns

`DocumentNode`

#### Defined in

[packages/documents/src/sort-executable-document.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/documents/src/sort-executable-document.ts#L7)
