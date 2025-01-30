# @graphql-tools/optimize

### Type Aliases

- [DocumentOptimizer](optimize_src#documentoptimizer)

### Functions

- [optimizeDocumentNode](optimize_src#optimizedocumentnode)
- [removeDescriptions](optimize_src#removedescriptions)
- [removeEmptyNodes](optimize_src#removeemptynodes)
- [removeLoc](optimize_src#removeloc)

## Type Aliases

### DocumentOptimizer

Ƭ **DocumentOptimizer**: (`input`: `DocumentNode`) => `DocumentNode`

#### Type declaration

▸ (`input`): `DocumentNode`

##### Parameters

| Name    | Type           |
| :------ | :------------- |
| `input` | `DocumentNode` |

##### Returns

`DocumentNode`

#### Defined in

[packages/optimize/src/types.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/optimize/src/types.ts#L3)

## Functions

### optimizeDocumentNode

▸ **optimizeDocumentNode**(`node`, `optimizers?`): `DocumentNode`

This method accept a DocumentNode and applies the optimizations you wish to use. You can override
the default ones or provide you own optimizers if you wish.

#### Parameters

| Name         | Type                                                    | Default value        | Description                        |
| :----------- | :------------------------------------------------------ | :------------------- | :--------------------------------- |
| `node`       | `DocumentNode`                                          | `undefined`          | document to optimize               |
| `optimizers` | [`DocumentOptimizer`](optimize_src#documentoptimizer)[] | `DEFAULT_OPTIMIZERS` | optional, list of optimizer to use |

#### Returns

`DocumentNode`

#### Defined in

[packages/optimize/src/optimize.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/optimize/src/optimize.ts#L16)

---

### removeDescriptions

▸ **removeDescriptions**(`input`): `DocumentNode`

This optimizer removes "description" field from schema AST definitions.

#### Parameters

| Name    | Type           |
| :------ | :------------- |
| `input` | `DocumentNode` |

#### Returns

`DocumentNode`

#### Defined in

[packages/optimize/src/types.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/optimize/src/types.ts#L3)

---

### removeEmptyNodes

▸ **removeEmptyNodes**(`input`): `DocumentNode`

This optimizer removes empty nodes/arrays (directives/argument/variableDefinitions) from a given
DocumentNode of operation/fragment.

#### Parameters

| Name    | Type           |
| :------ | :------------- |
| `input` | `DocumentNode` |

#### Returns

`DocumentNode`

#### Defined in

[packages/optimize/src/types.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/optimize/src/types.ts#L3)

---

### removeLoc

▸ **removeLoc**(`input`): `DocumentNode`

This optimizer removes "loc" fields

#### Parameters

| Name    | Type           |
| :------ | :------------- |
| `input` | `DocumentNode` |

#### Returns

`DocumentNode`

#### Defined in

[packages/optimize/src/types.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/optimize/src/types.ts#L3)
