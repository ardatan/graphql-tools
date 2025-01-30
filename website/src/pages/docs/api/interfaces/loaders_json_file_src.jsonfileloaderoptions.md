[graphql-tools-monorepo](../README) / [loaders/json-file/src](../modules/loaders_json_file_src) /
JsonFileLoaderOptions

# Interface: JsonFileLoaderOptions

[loaders/json-file/src](../modules/loaders_json_file_src).JsonFileLoaderOptions

Additional options for loading from a JSON file

## Hierarchy

- [`BaseLoaderOptions`](../modules/utils_src#baseloaderoptions)

  ↳ **`JsonFileLoaderOptions`**

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](loaders_json_file_src.JsonFileLoaderOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](loaders_json_file_src.JsonFileLoaderOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](loaders_json_file_src.JsonFileLoaderOptions#assumevalid)
- [assumeValidSDL](loaders_json_file_src.JsonFileLoaderOptions#assumevalidsdl)
- [commentDescriptions](loaders_json_file_src.JsonFileLoaderOptions#commentdescriptions)
- [cwd](loaders_json_file_src.JsonFileLoaderOptions#cwd)
- [experimentalFragmentVariables](loaders_json_file_src.JsonFileLoaderOptions#experimentalfragmentvariables)
- [ignore](loaders_json_file_src.JsonFileLoaderOptions#ignore)
- [includeSources](loaders_json_file_src.JsonFileLoaderOptions#includesources)
- [noLocation](loaders_json_file_src.JsonFileLoaderOptions#nolocation)

## Properties

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Inherited from

BaseLoaderOptions.allowLegacySDLEmptyFields

#### Defined in

[packages/utils/src/Interfaces.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L95)

---

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Inherited from

BaseLoaderOptions.allowLegacySDLImplementsInterfaces

#### Defined in

[packages/utils/src/Interfaces.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L96)

---

### assumeValid

• `Optional` **assumeValid**: `boolean`

When building a schema from a GraphQL service's introspection result, it might be safe to assume the
schema is valid. Set to true to assume the produced schema is valid.

Default: false

#### Inherited from

BaseLoaderOptions.assumeValid

#### Defined in

node_modules/graphql/type/schema.d.ts:146

---

### assumeValidSDL

• `Optional` **assumeValidSDL**: `boolean`

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

BaseLoaderOptions.assumeValidSDL

#### Defined in

node_modules/graphql/utilities/buildASTSchema.d.ts:12

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

BaseLoaderOptions.commentDescriptions

#### Defined in

[packages/utils/src/Interfaces.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L103)

---

### cwd

• `Optional` **cwd**: `string`

#### Inherited from

BaseLoaderOptions.cwd

#### Defined in

[packages/utils/src/loaders.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L13)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

BaseLoaderOptions.experimentalFragmentVariables

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### ignore

• `Optional` **ignore**: `string` \| `string`[]

#### Inherited from

BaseLoaderOptions.ignore

#### Defined in

[packages/utils/src/loaders.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L14)

---

### includeSources

• `Optional` **includeSources**: `boolean`

#### Inherited from

BaseLoaderOptions.includeSources

#### Defined in

[packages/utils/src/loaders.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L15)

---

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

BaseLoaderOptions.noLocation

#### Defined in

[packages/utils/src/Interfaces.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L94)
