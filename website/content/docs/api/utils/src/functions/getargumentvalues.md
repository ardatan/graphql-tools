---
title: "getArgumentValues"
description: "The getArgumentValues function exported by @graphql-tools/utils."
---

> **getArgumentValues**(`def`, `node`, `variableValues?`): `Record`\<`string`, `any`\>

Defined in: [packages/utils/src/getArgumentValues.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/getArgumentValues.ts#L25)

Prepares an object map of argument values given a list of argument
definitions and list of argument AST nodes.

Note: The returned value is a plain Object with a prototype, since it is
exposed to user code. Care should be taken to not pull values from the
Object prototype.

## Parameters

### def

`GraphQLDirective` \| `GraphQLField`\<`any`, `any`, `any`\>

### node

`FieldNode` \| `DirectiveNode`

### variableValues?

`Record`\<`string`, `any`\> = `{}`

## Returns

`Record`\<`string`, `any`\>
