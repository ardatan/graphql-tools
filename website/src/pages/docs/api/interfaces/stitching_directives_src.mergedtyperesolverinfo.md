[graphql-tools-monorepo](../README) /
[stitching-directives/src](../modules/stitching_directives_src) / MergedTypeResolverInfo

# Interface: MergedTypeResolverInfo

[stitching-directives/src](../modules/stitching_directives_src).MergedTypeResolverInfo

## Hierarchy

- [`ParsedMergeArgsExpr`](stitching_directives_src.ParsedMergeArgsExpr)

  ↳ **`MergedTypeResolverInfo`**

## Table of contents

### Properties

- [args](stitching_directives_src.MergedTypeResolverInfo#args)
- [expansions](stitching_directives_src.MergedTypeResolverInfo#expansions)
- [fieldName](stitching_directives_src.MergedTypeResolverInfo#fieldname)
- [mappingInstructions](stitching_directives_src.MergedTypeResolverInfo#mappinginstructions)
- [returnsList](stitching_directives_src.MergedTypeResolverInfo#returnslist)
- [usedProperties](stitching_directives_src.MergedTypeResolverInfo#usedproperties)

## Properties

### args

• **args**: `Record`\<`string`, `any`>

#### Inherited from

[ParsedMergeArgsExpr](stitching_directives_src.ParsedMergeArgsExpr).[args](stitching_directives_src.ParsedMergeArgsExpr#args)

#### Defined in

[packages/stitching-directives/src/types.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L6)

---

### expansions

• `Optional` **expansions**: [`Expansion`](stitching_directives_src.Expansion)[]

#### Inherited from

[ParsedMergeArgsExpr](stitching_directives_src.ParsedMergeArgsExpr).[expansions](stitching_directives_src.ParsedMergeArgsExpr#expansions)

#### Defined in

[packages/stitching-directives/src/types.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L9)

---

### fieldName

• **fieldName**: `string`

#### Defined in

[packages/stitching-directives/src/types.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L43)

---

### mappingInstructions

• `Optional` **mappingInstructions**:
[`MappingInstruction`](stitching_directives_src.MappingInstruction)[]

#### Inherited from

[ParsedMergeArgsExpr](stitching_directives_src.ParsedMergeArgsExpr).[mappingInstructions](stitching_directives_src.ParsedMergeArgsExpr#mappinginstructions)

#### Defined in

[packages/stitching-directives/src/types.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L8)

---

### returnsList

• **returnsList**: `boolean`

#### Defined in

[packages/stitching-directives/src/types.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L44)

---

### usedProperties

• **usedProperties**: [`PropertyTree`](stitching_directives_src.PropertyTree)

#### Inherited from

[ParsedMergeArgsExpr](stitching_directives_src.ParsedMergeArgsExpr).[usedProperties](stitching_directives_src.ParsedMergeArgsExpr#usedproperties)

#### Defined in

[packages/stitching-directives/src/types.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/types.ts#L7)
