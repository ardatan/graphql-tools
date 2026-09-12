---
title: "IResolverValidationOptions"
description: "The IResolverValidationOptions interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/Interfaces.ts:159](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L159)

Options for validating resolvers

## Properties

### requireResolversForAllFields?

> `optional` **requireResolversForAllFields?**: [`ValidatorBehavior`](/docs/api/utils/src/type-aliases/validatorbehavior)

Defined in: [packages/utils/src/Interfaces.ts:174](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L174)

Enable to require a resolver for be defined for all fields defined
in the schema. Defaults to `ignore`.

***

### requireResolversForArgs?

> `optional` **requireResolversForArgs?**: [`ValidatorBehavior`](/docs/api/utils/src/type-aliases/validatorbehavior)

Defined in: [packages/utils/src/Interfaces.ts:164](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L164)

Enable to require a resolver to be defined for any field that has
arguments. Defaults to `ignore`.

***

### requireResolversForNonScalar?

> `optional` **requireResolversForNonScalar?**: [`ValidatorBehavior`](/docs/api/utils/src/type-aliases/validatorbehavior)

Defined in: [packages/utils/src/Interfaces.ts:169](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L169)

Enable to require a resolver to be defined for any field which has
a return type that isn't a scalar. Defaults to `ignore`.

***

### requireResolversForResolveType?

> `optional` **requireResolversForResolveType?**: [`ValidatorBehavior`](/docs/api/utils/src/type-aliases/validatorbehavior)

Defined in: [packages/utils/src/Interfaces.ts:179](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L179)

Enable to require a `resolveType()` for Interface and Union types.
Defaults to `ignore`.

***

### requireResolversToMatchSchema?

> `optional` **requireResolversToMatchSchema?**: [`ValidatorBehavior`](/docs/api/utils/src/type-aliases/validatorbehavior)

Defined in: [packages/utils/src/Interfaces.ts:184](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L184)

Enable to require all defined resolvers to match fields that
actually exist in the schema. Defaults to `error` to catch common errors.
