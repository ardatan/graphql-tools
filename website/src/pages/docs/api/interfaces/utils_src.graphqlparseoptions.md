[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / GraphQLParseOptions

# Interface: GraphQLParseOptions

[utils/src](../modules/utils_src).GraphQLParseOptions

## Hierarchy

- **`GraphQLParseOptions`**

  ↳ [`IExecutableSchemaDefinition`](schema_src.IExecutableSchemaDefinition)

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](utils_src.GraphQLParseOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](utils_src.GraphQLParseOptions#allowlegacysdlimplementsinterfaces)
- [commentDescriptions](utils_src.GraphQLParseOptions#commentdescriptions)
- [experimentalFragmentVariables](utils_src.GraphQLParseOptions#experimentalfragmentvariables)
- [noLocation](utils_src.GraphQLParseOptions#nolocation)

## Properties

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Defined in

[packages/utils/src/Interfaces.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L95)

---

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Defined in

[packages/utils/src/Interfaces.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L96)

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Defined in

[packages/utils/src/Interfaces.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L103)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### noLocation

• `Optional` **noLocation**: `boolean`

#### Defined in

[packages/utils/src/Interfaces.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L94)
