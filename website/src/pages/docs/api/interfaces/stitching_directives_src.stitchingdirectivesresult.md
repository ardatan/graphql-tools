[graphql-tools-monorepo](../README) /
[stitching-directives/src](../modules/stitching_directives_src) / StitchingDirectivesResult

# Interface: StitchingDirectivesResult

[stitching-directives/src](../modules/stitching_directives_src).StitchingDirectivesResult

## Table of contents

### Properties

- [allStitchingDirectives](stitching_directives_src.StitchingDirectivesResult#allstitchingdirectives)
- [allStitchingDirectivesTypeDefs](stitching_directives_src.StitchingDirectivesResult#allstitchingdirectivestypedefs)
- [canonicalDirective](stitching_directives_src.StitchingDirectivesResult#canonicaldirective)
- [canonicalDirectiveTypeDefs](stitching_directives_src.StitchingDirectivesResult#canonicaldirectivetypedefs)
- [computedDirective](stitching_directives_src.StitchingDirectivesResult#computeddirective)
- [computedDirectiveTypeDefs](stitching_directives_src.StitchingDirectivesResult#computeddirectivetypedefs)
- [keyDirective](stitching_directives_src.StitchingDirectivesResult#keydirective)
- [keyDirectiveTypeDefs](stitching_directives_src.StitchingDirectivesResult#keydirectivetypedefs)
- [mergeDirective](stitching_directives_src.StitchingDirectivesResult#mergedirective)
- [mergeDirectiveTypeDefs](stitching_directives_src.StitchingDirectivesResult#mergedirectivetypedefs)
- [stitchingDirectivesTransformer](stitching_directives_src.StitchingDirectivesResult#stitchingdirectivestransformer)
- [stitchingDirectivesTypeDefs](stitching_directives_src.StitchingDirectivesResult#stitchingdirectivestypedefs)
- [stitchingDirectivesValidator](stitching_directives_src.StitchingDirectivesResult#stitchingdirectivesvalidator)

## Properties

### allStitchingDirectives

• **allStitchingDirectives**: `GraphQLDirective`[]

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L27)

---

### allStitchingDirectivesTypeDefs

• **allStitchingDirectivesTypeDefs**: `string`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L20)

---

### canonicalDirective

• **canonicalDirective**: `GraphQLDirective`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L26)

---

### canonicalDirectiveTypeDefs

• **canonicalDirectiveTypeDefs**: `string`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L18)

---

### computedDirective

• **computedDirective**: `GraphQLDirective`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L24)

---

### computedDirectiveTypeDefs

• **computedDirectiveTypeDefs**: `string`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L16)

---

### keyDirective

• **keyDirective**: `GraphQLDirective`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L23)

---

### keyDirectiveTypeDefs

• **keyDirectiveTypeDefs**: `string`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L15)

---

### mergeDirective

• **mergeDirective**: `GraphQLDirective`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L25)

---

### mergeDirectiveTypeDefs

• **mergeDirectiveTypeDefs**: `string`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L17)

---

### stitchingDirectivesTransformer

• **stitchingDirectivesTransformer**: (`subschemaConfig`:
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>>)
=> [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`,
`any`>>

#### Type declaration

▸ (`subschemaConfig`): [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>>

##### Parameters

| Name              | Type                                                                                                |
| :---------------- | :-------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |

##### Returns

[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>>

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L22)

---

### stitchingDirectivesTypeDefs

• **stitchingDirectivesTypeDefs**: `string`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L19)

---

### stitchingDirectivesValidator

• **stitchingDirectivesValidator**: (`schema`: `GraphQLSchema`) => `GraphQLSchema`

#### Type declaration

▸ (`schema`): `GraphQLSchema`

##### Parameters

| Name     | Type            |
| :------- | :-------------- |
| `schema` | `GraphQLSchema` |

##### Returns

`GraphQLSchema`

#### Defined in

[packages/stitching-directives/src/stitchingDirectives.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/stitching-directives/src/stitchingDirectives.ts#L21)
