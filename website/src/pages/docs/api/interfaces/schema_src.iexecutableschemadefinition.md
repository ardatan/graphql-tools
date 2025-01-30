[graphql-tools-monorepo](../README) / [schema/src](../modules/schema_src) /
IExecutableSchemaDefinition

# Interface: IExecutableSchemaDefinition<TContext\>

[schema/src](../modules/schema_src).IExecutableSchemaDefinition

Configuration object for creating an executable schema

## Type parameters

| Name       | Type  |
| :--------- | :---- |
| `TContext` | `any` |

## Hierarchy

- `BuildSchemaOptions`

- [`GraphQLParseOptions`](utils_src.GraphQLParseOptions)

  ↳ **`IExecutableSchemaDefinition`**

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](schema_src.IExecutableSchemaDefinition#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](schema_src.IExecutableSchemaDefinition#allowlegacysdlimplementsinterfaces)
- [assumeValid](schema_src.IExecutableSchemaDefinition#assumevalid)
- [assumeValidSDL](schema_src.IExecutableSchemaDefinition#assumevalidsdl)
- [commentDescriptions](schema_src.IExecutableSchemaDefinition#commentdescriptions)
- [experimentalFragmentVariables](schema_src.IExecutableSchemaDefinition#experimentalfragmentvariables)
- [inheritResolversFromInterfaces](schema_src.IExecutableSchemaDefinition#inheritresolversfrominterfaces)
- [noLocation](schema_src.IExecutableSchemaDefinition#nolocation)
- [resolverValidationOptions](schema_src.IExecutableSchemaDefinition#resolvervalidationoptions)
- [resolvers](schema_src.IExecutableSchemaDefinition#resolvers)
- [schemaExtensions](schema_src.IExecutableSchemaDefinition#schemaextensions)
- [typeDefs](schema_src.IExecutableSchemaDefinition#typedefs)
- [updateResolversInPlace](schema_src.IExecutableSchemaDefinition#updateresolversinplace)

## Properties

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Inherited from

[GraphQLParseOptions](utils_src.GraphQLParseOptions).[allowLegacySDLEmptyFields](utils_src.GraphQLParseOptions#allowlegacysdlemptyfields)

#### Defined in

[packages/utils/src/Interfaces.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L95)

---

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Inherited from

[GraphQLParseOptions](utils_src.GraphQLParseOptions).[allowLegacySDLImplementsInterfaces](utils_src.GraphQLParseOptions#allowlegacysdlimplementsinterfaces)

#### Defined in

[packages/utils/src/Interfaces.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L96)

---

### assumeValid

• `Optional` **assumeValid**: `boolean`

When building a schema from a GraphQL service's introspection result, it might be safe to assume the
schema is valid. Set to true to assume the produced schema is valid.

Default: false

#### Inherited from

BuildSchemaOptions.assumeValid

#### Defined in

node_modules/graphql/type/schema.d.ts:146

---

### assumeValidSDL

• `Optional` **assumeValidSDL**: `boolean`

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

BuildSchemaOptions.assumeValidSDL

#### Defined in

node_modules/graphql/utilities/buildASTSchema.d.ts:12

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

[GraphQLParseOptions](utils_src.GraphQLParseOptions).[commentDescriptions](utils_src.GraphQLParseOptions#commentdescriptions)

#### Defined in

[packages/utils/src/Interfaces.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L103)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

[GraphQLParseOptions](utils_src.GraphQLParseOptions).[experimentalFragmentVariables](utils_src.GraphQLParseOptions#experimentalfragmentvariables)

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### inheritResolversFromInterfaces

• `Optional` **inheritResolversFromInterfaces**: `boolean`

GraphQL object types that implement interfaces will inherit any missing resolvers from their
interface types defined in the `resolvers` object

#### Defined in

[packages/schema/src/types.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L36)

---

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

[GraphQLParseOptions](utils_src.GraphQLParseOptions).[noLocation](utils_src.GraphQLParseOptions#nolocation)

#### Defined in

[packages/utils/src/Interfaces.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L94)

---

### resolverValidationOptions

• `Optional` **resolverValidationOptions**:
[`IResolverValidationOptions`](utils_src.IResolverValidationOptions)

Additional options for validating the provided resolvers

#### Defined in

[packages/schema/src/types.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L31)

---

### resolvers

• `Optional` **resolvers**: [`IResolvers`](../modules/utils_src#iresolvers)\<`any`, `TContext`> \|
[`IResolvers`](../modules/utils_src#iresolvers)\<`any`, `TContext`>[]

Object describing the field resolvers for the provided type definitions

#### Defined in

[packages/schema/src/types.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L27)

---

### schemaExtensions

• `Optional` **schemaExtensions**: [`SchemaExtensions`](../modules/utils_src#schemaextensions) \|
[`SchemaExtensions`](../modules/utils_src#schemaextensions)[]

Schema extensions

#### Defined in

[packages/schema/src/types.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L44)

---

### typeDefs

• **typeDefs**: [`TypeSource`](../modules/utils_src#typesource)

The type definitions used to create the schema

#### Defined in

[packages/schema/src/types.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L23)

---

### updateResolversInPlace

• `Optional` **updateResolversInPlace**: `boolean`

Do not create a schema again and use the one from `buildASTSchema`

#### Defined in

[packages/schema/src/types.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L40)
