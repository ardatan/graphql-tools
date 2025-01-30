[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) /
IAddResolversToSchemaOptions

# Interface: IAddResolversToSchemaOptions

[utils/src](../modules/utils_src).IAddResolversToSchemaOptions

Configuration object for adding resolvers to a schema

## Table of contents

### Properties

- [defaultFieldResolver](utils_src.IAddResolversToSchemaOptions#defaultfieldresolver)
- [inheritResolversFromInterfaces](utils_src.IAddResolversToSchemaOptions#inheritresolversfrominterfaces)
- [resolverValidationOptions](utils_src.IAddResolversToSchemaOptions#resolvervalidationoptions)
- [resolvers](utils_src.IAddResolversToSchemaOptions#resolvers)
- [schema](utils_src.IAddResolversToSchemaOptions#schema)
- [updateResolversInPlace](utils_src.IAddResolversToSchemaOptions#updateresolversinplace)

## Properties

### defaultFieldResolver

• `Optional` **defaultFieldResolver**:
[`IFieldResolver`](../modules/utils_src#ifieldresolver)\<`any`, `any`, `Record`\<`string`, `any`>,
`any`>

Override the default field resolver provided by `graphql-js`

#### Defined in

[packages/utils/src/Interfaces.ts:156](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L156)

---

### inheritResolversFromInterfaces

• `Optional` **inheritResolversFromInterfaces**: `boolean`

GraphQL object types that implement interfaces will inherit any missing resolvers from their
interface types defined in the `resolvers` object

#### Defined in

[packages/utils/src/Interfaces.ts:165](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L165)

---

### resolverValidationOptions

• `Optional` **resolverValidationOptions**:
[`IResolverValidationOptions`](utils_src.IResolverValidationOptions)

Additional options for validating the provided resolvers

#### Defined in

[packages/utils/src/Interfaces.ts:160](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L160)

---

### resolvers

• **resolvers**: [`IResolvers`](../modules/utils_src#iresolvers)\<`any`, `any`, `Record`\<`string`,
`any`>, `any`>

Object describing the field resolvers to add to the provided schema

#### Defined in

[packages/utils/src/Interfaces.ts:152](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L152)

---

### schema

• **schema**: `GraphQLSchema`

The schema to which to add resolvers

#### Defined in

[packages/utils/src/Interfaces.ts:148](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L148)

---

### updateResolversInPlace

• `Optional` **updateResolversInPlace**: `boolean`

Set to `true` to modify the existing schema instead of creating a new one

#### Defined in

[packages/utils/src/Interfaces.ts:169](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L169)
