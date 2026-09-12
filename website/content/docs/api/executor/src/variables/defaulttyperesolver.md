---
title: "defaultTypeResolver"
description: "The defaultTypeResolver variable exported by @graphql-tools/executor."
---

> `const` **defaultTypeResolver**: `GraphQLTypeResolver`\<`unknown`, `unknown`\>

Defined in: [packages/executor/src/execution/execute.ts:1540](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L1540)

If a resolveType function is not given, then a default resolve behavior is
used which attempts two strategies:

First, See if the provided value has a `__typename` field defined, if so, use
that value as name of the resolved type.

Otherwise, test each possible type for the abstract type by calling
isTypeOf for the object being coerced, returning the first type that matches.
