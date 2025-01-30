# @graphql-tools/stitching-directives

### Interfaces

- [Expansion](/docs/api/interfaces/stitching_directives_src.Expansion)
- [MappingInstruction](/docs/api/interfaces/stitching_directives_src.MappingInstruction)
- [MergedTypeResolverInfo](/docs/api/interfaces/stitching_directives_src.MergedTypeResolverInfo)
- [ParsedMergeArgsExpr](/docs/api/interfaces/stitching_directives_src.ParsedMergeArgsExpr)
- [PropertyTree](/docs/api/interfaces/stitching_directives_src.PropertyTree)
- [StitchingDirectivesOptions](/docs/api/interfaces/stitching_directives_src.StitchingDirectivesOptions)
- [StitchingDirectivesResult](/docs/api/interfaces/stitching_directives_src.StitchingDirectivesResult)

### Type Aliases

- [StitchingDirectivesFinalOptions](stitching_directives_src#stitchingdirectivesfinaloptions)
- [VariablePaths](stitching_directives_src#variablepaths)

### Functions

- [federationToStitchingSDL](stitching_directives_src#federationtostitchingsdl)
- [stitchingDirectives](stitching_directives_src#stitchingdirectives)

## Type Aliases

### StitchingDirectivesFinalOptions

Ƭ **StitchingDirectivesFinalOptions**:
`Complete`\<[`StitchingDirectivesOptions`](/docs/api/interfaces/stitching_directives_src.StitchingDirectivesOptions)>

#### Defined in

[packages/stitching-directives/src/types.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L40)

---

### VariablePaths

Ƭ **VariablePaths**: `Record`\<`string`, (`string` \| `number`)[]>

#### Defined in

[packages/stitching-directives/src/types.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L23)

## Functions

### federationToStitchingSDL

▸ **federationToStitchingSDL**(`federationSDL`, `stitchingConfig?`): `string`

#### Parameters

| Name              | Type                                                                                                   |
| :---------------- | :----------------------------------------------------------------------------------------------------- |
| `federationSDL`   | `string`                                                                                               |
| `stitchingConfig` | [`StitchingDirectivesResult`](/docs/api/interfaces/stitching_directives_src.StitchingDirectivesResult) |

#### Returns

`string`

#### Defined in

[packages/stitching-directives/src/federationToStitchingSDL.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/federationToStitchingSDL.ts#L54)

---

### stitchingDirectives

▸ **stitchingDirectives**(`options?`):
[`StitchingDirectivesResult`](/docs/api/interfaces/stitching_directives_src.StitchingDirectivesResult)

#### Parameters

| Name      | Type                                                                                                     |
| :-------- | :------------------------------------------------------------------------------------------------------- |
| `options` | [`StitchingDirectivesOptions`](/docs/api/interfaces/stitching_directives_src.StitchingDirectivesOptions) |

#### Returns

[`StitchingDirectivesResult`](/docs/api/interfaces/stitching_directives_src.StitchingDirectivesResult)

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L30)
