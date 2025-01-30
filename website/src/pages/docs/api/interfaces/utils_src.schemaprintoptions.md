[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / SchemaPrintOptions

# Interface: SchemaPrintOptions

[utils/src](../modules/utils_src).SchemaPrintOptions

## Table of contents

### Properties

- [assumeValid](utils_src.SchemaPrintOptions#assumevalid)
- [commentDescriptions](utils_src.SchemaPrintOptions#commentdescriptions)

## Properties

### assumeValid

• `Optional` **assumeValid**: `boolean`

#### Defined in

[packages/utils/src/types.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L19)

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Descriptions are defined as preceding string literals, however an older experimental version of the
SDL supported preceding comments as descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false

#### Defined in

[packages/utils/src/types.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L18)
