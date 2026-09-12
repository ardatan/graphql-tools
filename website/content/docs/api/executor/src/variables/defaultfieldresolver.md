---
title: "defaultFieldResolver"
description: "The defaultFieldResolver variable exported by @graphql-tools/executor."
---

> `const` **defaultFieldResolver**: `GraphQLFieldResolver`\<`unknown`, `unknown`\>

Defined in: [packages/executor/src/execution/execute.ts:1586](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L1586)

If a resolve function is not given, then a default resolve behavior is used
which takes the property of the source object of the same name as the field
and returns it as the result, or if it's a function, returns the result
of calling that function while passing along args and context value.
