[graphql-tools-monorepo](../README) / [stitch/src](../modules/stitch_src) / IStitchSchemasOptions

# Interface: IStitchSchemasOptions<TContext\>

[stitch/src](../modules/stitch_src).IStitchSchemasOptions

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Hierarchy

- `Omit`\<[`IExecutableSchemaDefinition`](schema_src.IExecutableSchemaDefinition)\<`TContext`>,
  `"typeDefs"`>

  ↳ **`IStitchSchemasOptions`**

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](stitch_src.IStitchSchemasOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](stitch_src.IStitchSchemasOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](stitch_src.IStitchSchemasOptions#assumevalid)
- [assumeValidSDL](stitch_src.IStitchSchemasOptions#assumevalidsdl)
- [commentDescriptions](stitch_src.IStitchSchemasOptions#commentdescriptions)
- [experimentalFragmentVariables](stitch_src.IStitchSchemasOptions#experimentalfragmentvariables)
- [inheritResolversFromInterfaces](stitch_src.IStitchSchemasOptions#inheritresolversfrominterfaces)
- [mergeDirectives](stitch_src.IStitchSchemasOptions#mergedirectives)
- [mergeTypes](stitch_src.IStitchSchemasOptions#mergetypes)
- [noLocation](stitch_src.IStitchSchemasOptions#nolocation)
- [onTypeConflict](stitch_src.IStitchSchemasOptions#ontypeconflict)
- [resolverValidationOptions](stitch_src.IStitchSchemasOptions#resolvervalidationoptions)
- [resolvers](stitch_src.IStitchSchemasOptions#resolvers)
- [schemaExtensions](stitch_src.IStitchSchemasOptions#schemaextensions)
- [subschemaConfigTransforms](stitch_src.IStitchSchemasOptions#subschemaconfigtransforms)
- [subschemas](stitch_src.IStitchSchemasOptions#subschemas)
- [typeDefs](stitch_src.IStitchSchemasOptions#typedefs)
- [typeMergingOptions](stitch_src.IStitchSchemasOptions#typemergingoptions)
- [types](stitch_src.IStitchSchemasOptions#types)
- [updateResolversInPlace](stitch_src.IStitchSchemasOptions#updateresolversinplace)

## Properties

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Inherited from

Omit.allowLegacySDLEmptyFields

#### Defined in

[packages/utils/src/Interfaces.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L95)

---

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Inherited from

Omit.allowLegacySDLImplementsInterfaces

#### Defined in

[packages/utils/src/Interfaces.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L96)

---

### assumeValid

• `Optional` **assumeValid**: `boolean`

When building a schema from a GraphQL service's introspection result, it might be safe to assume the
schema is valid. Set to true to assume the produced schema is valid.

Default: false

#### Inherited from

Omit.assumeValid

#### Defined in

node_modules/graphql/type/schema.d.ts:146

---

### assumeValidSDL

• `Optional` **assumeValidSDL**: `boolean`

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

Omit.assumeValidSDL

#### Defined in

node_modules/graphql/utilities/buildASTSchema.d.ts:12

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

Omit.commentDescriptions

#### Defined in

[packages/utils/src/Interfaces.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L103)

---

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

Omit.experimentalFragmentVariables

#### Defined in

[packages/utils/src/Interfaces.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L97)

---

### inheritResolversFromInterfaces

• `Optional` **inheritResolversFromInterfaces**: `boolean`

GraphQL object types that implement interfaces will inherit any missing resolvers from their
interface types defined in the `resolvers` object

#### Inherited from

Omit.inheritResolversFromInterfaces

#### Defined in

[packages/schema/src/types.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L36)

---

### mergeDirectives

• `Optional` **mergeDirectives**: `boolean`

#### Defined in

[packages/stitch/src/types.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L59)

---

### mergeTypes

• `Optional` **mergeTypes**: `boolean` \| `string`[] \|
[`MergeTypeFilter`](../modules/stitch_src#mergetypefilter)\<`TContext`>

#### Defined in

[packages/stitch/src/types.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L60)

---

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

Omit.noLocation

#### Defined in

[packages/utils/src/Interfaces.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L94)

---

### onTypeConflict

• `Optional` **onTypeConflict**:
[`OnTypeConflict`](../modules/stitch_src#ontypeconflict)\<`TContext`>

#### Defined in

[packages/stitch/src/types.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L58)

---

### resolverValidationOptions

• `Optional` **resolverValidationOptions**:
[`IResolverValidationOptions`](utils_src.IResolverValidationOptions)

Additional options for validating the provided resolvers

#### Inherited from

Omit.resolverValidationOptions

#### Defined in

[packages/schema/src/types.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L31)

---

### resolvers

• `Optional` **resolvers**: [`IResolvers`](../modules/utils_src#iresolvers)\<`any`, `TContext`> \|
[`IResolvers`](../modules/utils_src#iresolvers)\<`any`, `TContext`>[]

Object describing the field resolvers for the provided type definitions

#### Inherited from

Omit.resolvers

#### Defined in

[packages/schema/src/types.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L27)

---

### schemaExtensions

• `Optional` **schemaExtensions**: [`SchemaExtensions`](../modules/utils_src#schemaextensions) \|
[`SchemaExtensions`](../modules/utils_src#schemaextensions)[]

Schema extensions

#### Inherited from

Omit.schemaExtensions

#### Defined in

[packages/schema/src/types.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L44)

---

### subschemaConfigTransforms

• `Optional` **subschemaConfigTransforms**:
[`SubschemaConfigTransform`](../modules/stitch_src#subschemaconfigtransform)\<`TContext`>[]

#### Defined in

[packages/stitch/src/types.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L62)

---

### subschemas

• `Optional` **subschemas**: (`GraphQLSchema` \|
[`SubschemaConfig`](delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`>)[]

#### Defined in

[packages/stitch/src/types.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L55)

---

### typeDefs

• `Optional` **typeDefs**: [`TypeSource`](../modules/utils_src#typesource)

#### Defined in

[packages/stitch/src/types.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L56)

---

### typeMergingOptions

• `Optional` **typeMergingOptions**:
[`TypeMergingOptions`](stitch_src.TypeMergingOptions)\<`TContext`>

#### Defined in

[packages/stitch/src/types.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L61)

---

### types

• `Optional` **types**: `GraphQLNamedType`[]

#### Defined in

[packages/stitch/src/types.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/types.ts#L57)

---

### updateResolversInPlace

• `Optional` **updateResolversInPlace**: `boolean`

Do not create a schema again and use the one from `buildASTSchema`

#### Inherited from

Omit.updateResolversInPlace

#### Defined in

[packages/schema/src/types.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L40)
