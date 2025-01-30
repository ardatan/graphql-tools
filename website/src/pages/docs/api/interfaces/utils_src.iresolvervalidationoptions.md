[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / IResolverValidationOptions

# Interface: IResolverValidationOptions

[utils/src](../modules/utils_src).IResolverValidationOptions

Options for validating resolvers

## Table of contents

### Properties

- [requireResolversForAllFields](utils_src.IResolverValidationOptions#requireresolversforallfields)
- [requireResolversForArgs](utils_src.IResolverValidationOptions#requireresolversforargs)
- [requireResolversForNonScalar](utils_src.IResolverValidationOptions#requireresolversfornonscalar)
- [requireResolversForResolveType](utils_src.IResolverValidationOptions#requireresolversforresolvetype)
- [requireResolversToMatchSchema](utils_src.IResolverValidationOptions#requireresolverstomatchschema)

## Properties

### requireResolversForAllFields

• `Optional` **requireResolversForAllFields**:
[`ValidatorBehavior`](../modules/utils_src#validatorbehavior)

Enable to require a resolver for be defined for all fields defined in the schema. Defaults to
`ignore`.

#### Defined in

[packages/utils/src/Interfaces.ts:128](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L128)

---

### requireResolversForArgs

• `Optional` **requireResolversForArgs**:
[`ValidatorBehavior`](../modules/utils_src#validatorbehavior)

Enable to require a resolver to be defined for any field that has arguments. Defaults to `ignore`.

#### Defined in

[packages/utils/src/Interfaces.ts:118](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L118)

---

### requireResolversForNonScalar

• `Optional` **requireResolversForNonScalar**:
[`ValidatorBehavior`](../modules/utils_src#validatorbehavior)

Enable to require a resolver to be defined for any field which has a return type that isn't a
scalar. Defaults to `ignore`.

#### Defined in

[packages/utils/src/Interfaces.ts:123](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L123)

---

### requireResolversForResolveType

• `Optional` **requireResolversForResolveType**:
[`ValidatorBehavior`](../modules/utils_src#validatorbehavior)

Enable to require a `resolveType()` for Interface and Union types. Defaults to `ignore`.

#### Defined in

[packages/utils/src/Interfaces.ts:133](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L133)

---

### requireResolversToMatchSchema

• `Optional` **requireResolversToMatchSchema**:
[`ValidatorBehavior`](../modules/utils_src#validatorbehavior)

Enable to require all defined resolvers to match fields that actually exist in the schema. Defaults
to `error` to catch common errors.

#### Defined in

[packages/utils/src/Interfaces.ts:138](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L138)
