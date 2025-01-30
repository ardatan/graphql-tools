# @graphql-tools/stitch

### Enumerations

- [ValidationLevel](/docs/api/enums/stitch_src.ValidationLevel)

### Interfaces

- [IStitchSchemasOptions](/docs/api/interfaces/stitch_src.IStitchSchemasOptions)
- [MergeEnumValueConfigCandidate](/docs/api/interfaces/stitch_src.MergeEnumValueConfigCandidate)
- [MergeFieldConfigCandidate](/docs/api/interfaces/stitch_src.MergeFieldConfigCandidate)
- [MergeInputFieldConfigCandidate](/docs/api/interfaces/stitch_src.MergeInputFieldConfigCandidate)
- [MergeTypeCandidate](/docs/api/interfaces/stitch_src.MergeTypeCandidate)
- [TypeMergingOptions](/docs/api/interfaces/stitch_src.TypeMergingOptions)
- [ValidationSettings](/docs/api/interfaces/stitch_src.ValidationSettings)

### Type Aliases

- [MergeTypeFilter](stitch_src#mergetypefilter)
- [OnTypeConflict](stitch_src#ontypeconflict)
- [SubschemaConfigTransform](stitch_src#subschemaconfigtransform)

### Functions

- [createMergedTypeResolver](stitch_src#createmergedtyperesolver)
- [createStitchingExecutor](stitch_src#createstitchingexecutor)
- [forwardArgsToSelectionSet](stitch_src#forwardargstoselectionset)
- [handleRelaySubschemas](stitch_src#handlerelaysubschemas)
- [isolateComputedFieldsTransformer](stitch_src#isolatecomputedfieldstransformer)
- [splitMergedTypeEntryPointsTransformer](stitch_src#splitmergedtypeentrypointstransformer)
- [stitchSchemas](stitch_src#stitchschemas)

## Type Aliases

### MergeTypeFilter

Ƭ **MergeTypeFilter**\<`TContext`>: (`mergeTypeCandidates`:
[`MergeTypeCandidate`](/docs/api/interfaces/stitch_src.MergeTypeCandidate)\<`TContext`>[],
`typeName`: `string`) => `boolean`

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Type declaration

▸ (`mergeTypeCandidates`, `typeName`): `boolean`

##### Parameters

| Name                  | Type                                                                                      |
| :-------------------- | :---------------------------------------------------------------------------------------- |
| `mergeTypeCandidates` | [`MergeTypeCandidate`](/docs/api/interfaces/stitch_src.MergeTypeCandidate)\<`TContext`>[] |
| `typeName`            | `string`                                                                                  |

##### Returns

`boolean`

#### Defined in

[packages/stitch/src/types.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L48)

---

### OnTypeConflict

Ƭ **OnTypeConflict**\<`TContext`>: (`left`: `GraphQLNamedType`, `right`: `GraphQLNamedType`,
`info?`: \{ `left`: \{ `subschema?`: `GraphQLSchema` \|
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`> ; `transformedSubschema?`:
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`> } ;
`right`: \{ `subschema?`: `GraphQLSchema` \|
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`> ; `transformedSubschema?`:
[`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`> } }) =>
`GraphQLNamedType`

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Type declaration

▸ (`left`, `right`, `info?`): `GraphQLNamedType`

##### Parameters

| Name                               | Type                                                                                                                        |
| :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `left`                             | `GraphQLNamedType`                                                                                                          |
| `right`                            | `GraphQLNamedType`                                                                                                          |
| `info?`                            | `Object`                                                                                                                    |
| `info.left`                        | `Object`                                                                                                                    |
| `info.left.subschema?`             | `GraphQLSchema` \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |
| `info.left.transformedSubschema?`  | [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>                                   |
| `info.right`                       | `Object`                                                                                                                    |
| `info.right.subschema?`            | `GraphQLSchema` \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |
| `info.right.transformedSubschema?` | [`Subschema`](/docs/api/classes/delegate_src.Subschema)\<`any`, `any`, `any`, `TContext`>                                   |

##### Returns

`GraphQLNamedType`

#### Defined in

[packages/stitch/src/types.ts:99](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L99)

---

### SubschemaConfigTransform

Ƭ **SubschemaConfigTransform**\<`TContext`>: (`subschemaConfig`:
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`>) => [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`,
`any`, `any`, `TContext`> \|
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`>[]

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Type declaration

▸ (`subschemaConfig`):
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`> \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`,
`any`, `TContext`>[]

##### Parameters

| Name              | Type                                                                                                     |
| :---------------- | :------------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |

##### Returns

[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`TContext`> \| [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`,
`any`, `TContext`>[]

#### Defined in

[packages/stitch/src/types.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L65)

## Functions

### createMergedTypeResolver

▸ **createMergedTypeResolver**<`TContext`\>(`mergedTypeResolverOptions`):
[`MergedTypeResolver`](delegate_src#mergedtyperesolver)\<`TContext`> \| `undefined`

#### Type parameters

| Name       | Type                                       |
| :--------- | :----------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `any` |

#### Parameters

| Name                        | Type                                                                                                      |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `mergedTypeResolverOptions` | [`MergedTypeResolverOptions`](/docs/api/interfaces/delegate_src.MergedTypeResolverOptions)\<`any`, `any`> |

#### Returns

[`MergedTypeResolver`](delegate_src#mergedtyperesolver)\<`TContext`> \| `undefined`

#### Defined in

[packages/stitch/src/createMergedTypeResolver.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/createMergedTypeResolver.ts#L9)

---

### createStitchingExecutor

▸ **createStitchingExecutor**(`stitchedSchema`): (`executorRequest`:
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>) => `Promise`\<\{ `data`: `Record`\<`string`, `any`> }>

Creates an executor that uses the schema created by stitching together multiple subschemas. Not
ready for production Breaking changes can be introduced in the meanwhile

#### Parameters

| Name             | Type            |
| :--------------- | :-------------- |
| `stitchedSchema` | `GraphQLSchema` |

#### Returns

`fn`

▸ (`executorRequest`): `Promise`\<\{ `data`: `Record`\<`string`, `any`> }>

##### Parameters

| Name              | Type                                                                                                                           |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `executorRequest` | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |

##### Returns

`Promise`\<\{ `data`: `Record`\<`string`, `any`> }>

#### Defined in

[packages/stitch/src/executor.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/executor.ts#L19)

---

### forwardArgsToSelectionSet

▸ **forwardArgsToSelectionSet**(`selectionSet`, `mapping?`): (`field`: `FieldNode`) =>
`SelectionSetNode`

#### Parameters

| Name           | Type                            |
| :------------- | :------------------------------ |
| `selectionSet` | `string`                        |
| `mapping?`     | `Record`\<`string`, `string`[]> |

#### Returns

`fn`

▸ (`field`): `SelectionSetNode`

##### Parameters

| Name    | Type        |
| :------ | :---------- |
| `field` | `FieldNode` |

##### Returns

`SelectionSetNode`

#### Defined in

[packages/stitch/src/selectionSetArgs.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/selectionSetArgs.ts#L4)

---

### handleRelaySubschemas

▸ **handleRelaySubschemas**(`subschemas`, `getTypeNameFromId?`):
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>>[]

#### Parameters

| Name                 | Type                                                                                                                       |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `subschemas`         | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>>[] |
| `getTypeNameFromId?` | (`id`: `string`) => `string`                                                                                               |

#### Returns

[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>>[]

#### Defined in

[packages/stitch/src/relay.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/relay.ts#L11)

---

### isolateComputedFieldsTransformer

▸ **isolateComputedFieldsTransformer**(`subschemaConfig`):
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)[]

#### Parameters

| Name              | Type                                                                                                                     |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |

#### Returns

[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)[]

#### Defined in

[packages/stitch/src/subschemaConfigTransforms/isolateComputedFieldsTransformer.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/subschemaConfigTransforms/isolateComputedFieldsTransformer.ts#L6)

---

### splitMergedTypeEntryPointsTransformer

▸ **splitMergedTypeEntryPointsTransformer**(`subschemaConfig`):
[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)[]

#### Parameters

| Name              | Type                                                                                                                     |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `subschemaConfig` | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |

#### Returns

[`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)[]

#### Defined in

[packages/stitch/src/subschemaConfigTransforms/splitMergedTypeEntryPointsTransformer.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/subschemaConfigTransforms/splitMergedTypeEntryPointsTransformer.ts#L3)

---

### stitchSchemas

▸ **stitchSchemas**<`TContext`\>(`«destructured»`): `GraphQLSchema`

#### Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

#### Parameters

| Name             | Type                                                                                          |
| :--------------- | :-------------------------------------------------------------------------------------------- |
| `«destructured»` | [`IStitchSchemasOptions`](/docs/api/interfaces/stitch_src.IStitchSchemasOptions)\<`TContext`> |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/stitch/src/stitchSchemas.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/stitchSchemas.ts#L29)
