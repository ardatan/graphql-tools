---
title: "ExecutionRequest"
description: "The ExecutionRequest interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/Interfaces.ts:107](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L107)

## Type Parameters

### TVariables

`TVariables` *extends* `Record`\<`string`, `any`\> = `any`

### TContext

`TContext` = `any`

### TRootValue

`TRootValue` = `any`

### TExtensions

`TExtensions` = `Record`\<`string`, `any`\>

### TReturn

`TReturn` = `any`

## Properties

### context?

> `optional` **context?**: `TContext`

Defined in: [packages/utils/src/Interfaces.ts:123](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L123)

***

### document

> **document**: `TypedDocumentNode`\<`TReturn`, `TVariables`\>

Defined in: [packages/utils/src/Interfaces.ts:114](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L114)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/utils/src/Interfaces.ts:119](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L119)

***

### info?

> `optional` **info?**: [`GraphQLResolveInfo`](/docs/api/utils/src/interfaces/graphqlresolveinfo)

Defined in: [packages/utils/src/Interfaces.ts:126](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L126)

***

### operationName?

> `optional` **operationName?**: `string`

Defined in: [packages/utils/src/Interfaces.ts:118](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L118)

***

### operationType?

> `optional` **operationType?**: `OperationTypeNode`

Defined in: [packages/utils/src/Interfaces.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L117)

***

### rootValue?

> `optional` **rootValue?**: `TRootValue`

Defined in: [packages/utils/src/Interfaces.ts:121](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L121)

***

### schemaCoordinateInErrors?

> `optional` **schemaCoordinateInErrors?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:134](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L134)

Enable/Disable the addition of field schema coordinate in GraphQL Errors extension

Note: Schema Coordinate are exposed using Symbol.for('schemaCoordinate') so that it's not
      serialized. Exposing schema coordinate can ease the discovery of private schemas.

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [packages/utils/src/Interfaces.ts:127](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L127)

***

### subgraphName?

> `optional` **subgraphName?**: `string`

Defined in: [packages/utils/src/Interfaces.ts:125](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L125)

***

### variables?

> `optional` **variables?**: `TVariables`

Defined in: [packages/utils/src/Interfaces.ts:115](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L115)
