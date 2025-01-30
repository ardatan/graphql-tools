[graphql-tools-monorepo](../README) /
[loaders/apollo-engine/src](../modules/loaders_apollo_engine_src) / ApolloEngineOptions

# Interface: ApolloEngineOptions

[loaders/apollo-engine/src](../modules/loaders_apollo_engine_src).ApolloEngineOptions

Additional options for loading from Apollo Engine

## Hierarchy

- [`BaseLoaderOptions`](../modules/utils_src#baseloaderoptions)

  ↳ **`ApolloEngineOptions`**

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](loaders_apollo_engine_src.ApolloEngineOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](loaders_apollo_engine_src.ApolloEngineOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](loaders_apollo_engine_src.ApolloEngineOptions#assumevalid)
- [assumeValidSDL](loaders_apollo_engine_src.ApolloEngineOptions#assumevalidsdl)
- [commentDescriptions](loaders_apollo_engine_src.ApolloEngineOptions#commentdescriptions)
- [cwd](loaders_apollo_engine_src.ApolloEngineOptions#cwd)
- [engine](loaders_apollo_engine_src.ApolloEngineOptions#engine)
- [experimentalFragmentVariables](loaders_apollo_engine_src.ApolloEngineOptions#experimentalfragmentvariables)
- [graph](loaders_apollo_engine_src.ApolloEngineOptions#graph)
- [headers](loaders_apollo_engine_src.ApolloEngineOptions#headers)
- [ignore](loaders_apollo_engine_src.ApolloEngineOptions#ignore)
- [includeSources](loaders_apollo_engine_src.ApolloEngineOptions#includesources)
- [noLocation](loaders_apollo_engine_src.ApolloEngineOptions#nolocation)
- [variant](loaders_apollo_engine_src.ApolloEngineOptions#variant)

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

### engine

• **engine**: `Object`

#### Type declaration

| Name        | Type     |
| :---------- | :------- |
| `apiKey`    | `string` |
| `endpoint?` | `string` |

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L9)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

BaseLoaderOptions.experimentalFragmentVariables

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### graph

• **graph**: `string`

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L13)

---

### headers

• `Optional` **headers**: `Record`\<`string`, `string`>

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L15)

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

---

### variant

• **variant**: `string`

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L14)
