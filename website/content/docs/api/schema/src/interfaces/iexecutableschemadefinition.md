---
title: "IExecutableSchemaDefinition"
description: "The IExecutableSchemaDefinition interface exported by @graphql-tools/schema."
---

Defined in: [packages/schema/src/types.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L17)

Configuration object for creating an executable schema

## Extends

- `BuildSchemaOptions`.[`GraphQLParseOptions`](/docs/api/utils/src/interfaces/graphqlparseoptions)

## Type Parameters

### TContext

`TContext` = `any`

## Properties

### allowLegacySDLEmptyFields?

> `optional` **allowLegacySDLEmptyFields?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:141](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L141)

#### Inherited from

[`GraphQLParseOptions`](/docs/api/utils/src/interfaces/graphqlparseoptions).[`allowLegacySDLEmptyFields`](/docs/api/utils/src/interfaces/graphqlparseoptions#allowlegacysdlemptyfields)

***

### allowLegacySDLImplementsInterfaces?

> `optional` **allowLegacySDLImplementsInterfaces?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:142](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L142)

#### Inherited from

[`GraphQLParseOptions`](/docs/api/utils/src/interfaces/graphqlparseoptions).[`allowLegacySDLImplementsInterfaces`](/docs/api/utils/src/interfaces/graphqlparseoptions#allowlegacysdlimplementsinterfaces)

***

### assumeValid?

> `optional` **assumeValid?**: `boolean`

Defined in: node\_modules/graphql/type/schema.d.mts:612

**`Internal`**

When building a schema from a GraphQL service's introspection result, it
might be safe to assume the schema is valid. Set to true to assume the
produced schema is valid.

Default: false

#### Inherited from

`BuildSchemaOptions.assumeValid`

***

### assumeValidSDL?

> `optional` **assumeValidSDL?**: `boolean`

Defined in: node\_modules/graphql/utilities/buildASTSchema.d.mts:14

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

`BuildSchemaOptions.assumeValidSDL`

***

### commentDescriptions?

> `optional` **commentDescriptions?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:149](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L149)

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

[`GraphQLParseOptions`](/docs/api/utils/src/interfaces/graphqlparseoptions).[`commentDescriptions`](/docs/api/utils/src/interfaces/graphqlparseoptions#commentdescriptions)

***

### defaultFieldResolver?

> `optional` **defaultFieldResolver?**: `GraphQLFieldResolver`\<`any`, `TContext`\>

Defined in: [packages/schema/src/types.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L47)

Default field resolver

***

### experimentalFragmentVariables?

> `optional` **experimentalFragmentVariables?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L143)

#### Inherited from

[`GraphQLParseOptions`](/docs/api/utils/src/interfaces/graphqlparseoptions).[`experimentalFragmentVariables`](/docs/api/utils/src/interfaces/graphqlparseoptions#experimentalfragmentvariables)

***

### inheritResolversFromInterfaces?

> `optional` **inheritResolversFromInterfaces?**: `boolean`

Defined in: [packages/schema/src/types.ts:35](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L35)

GraphQL object types that implement interfaces will inherit any missing
resolvers from their interface types defined in the `resolvers` object

***

### noLocation?

> `optional` **noLocation?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L140)

#### Inherited from

[`GraphQLParseOptions`](/docs/api/utils/src/interfaces/graphqlparseoptions).[`noLocation`](/docs/api/utils/src/interfaces/graphqlparseoptions#nolocation)

***

### resolvers?

> `optional` **resolvers?**: [`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)\<`any`, `TContext`\> \| [`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)\<`any`, `TContext`\>[]

Defined in: [packages/schema/src/types.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L26)

Object describing the field resolvers for the provided type definitions

***

### resolverValidationOptions?

> `optional` **resolverValidationOptions?**: [`IResolverValidationOptions`](/docs/api/utils/src/interfaces/iresolvervalidationoptions)

Defined in: [packages/schema/src/types.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L30)

Additional options for validating the provided resolvers

***

### schemaExtensions?

> `optional` **schemaExtensions?**: [`SchemaExtensions`](/docs/api/utils/src/type-aliases/schemaextensions) \| [`SchemaExtensions`](/docs/api/utils/src/type-aliases/schemaextensions)[]

Defined in: [packages/schema/src/types.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L43)

Schema extensions

***

### typeDefs

> **typeDefs**: [`TypeSource`](/docs/api/utils/src/type-aliases/typesource)

Defined in: [packages/schema/src/types.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L22)

The type definitions used to create the schema

***

### updateResolversInPlace?

> `optional` **updateResolversInPlace?**: `boolean`

Defined in: [packages/schema/src/types.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L39)

Do not create a schema again and use the one from `buildASTSchema`
