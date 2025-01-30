[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / PruneSchemaOptions

# Interface: PruneSchemaOptions

[utils/src](../modules/utils_src).PruneSchemaOptions

Options for removing unused types from the schema

## Table of contents

### Properties

- [skipEmptyCompositeTypePruning](utils_src.PruneSchemaOptions#skipemptycompositetypepruning)
- [skipEmptyUnionPruning](utils_src.PruneSchemaOptions#skipemptyunionpruning)
- [skipPruning](utils_src.PruneSchemaOptions#skippruning)
- [skipUnimplementedInterfacesPruning](utils_src.PruneSchemaOptions#skipunimplementedinterfacespruning)
- [skipUnusedTypesPruning](utils_src.PruneSchemaOptions#skipunusedtypespruning)

## Properties

### skipEmptyCompositeTypePruning

• `Optional` **skipEmptyCompositeTypePruning**: `boolean`

Set to `true` to skip pruning object types or interfaces with no no fields

#### Defined in

[packages/utils/src/types.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L48)

---

### skipEmptyUnionPruning

• `Optional` **skipEmptyUnionPruning**: `boolean`

Set to `true` to skip pruning empty unions

#### Defined in

[packages/utils/src/types.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L57)

---

### skipPruning

• `Optional` **skipPruning**: [`PruneSchemaFilter`](../modules/utils_src#pruneschemafilter)

Return true to skip pruning this type. This check will run first before any other options. This can
be helpful for schemas that support type extensions like Apollo Federation.

#### Defined in

[packages/utils/src/types.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L43)

---

### skipUnimplementedInterfacesPruning

• `Optional` **skipUnimplementedInterfacesPruning**: `boolean`

Set to `true` to skip pruning interfaces that are not implemented by any other types

#### Defined in

[packages/utils/src/types.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L53)

---

### skipUnusedTypesPruning

• `Optional` **skipUnusedTypesPruning**: `boolean`

Set to `true` to skip pruning unused types

#### Defined in

[packages/utils/src/types.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L61)
