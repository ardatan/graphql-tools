---
title: "Config"
description: "The Config interface exported by @graphql-tools/merge."
---

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L29)

## Extends

- `ParseOptions`.[`GetDocumentNodeFromSchemaOptions`](/docs/api/utils/src/interfaces/getdocumentnodefromschemaoptions)

## Properties

### commentDescriptions?

> `optional` **commentDescriptions?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L57)

Descriptions are defined as preceding string literals, however an older
experimental version of the SDL supported preceding comments as
descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false

***

### consistentEnumMerge?

> `optional` **consistentEnumMerge?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L79)

***

### convertExtensions?

> `optional` **convertExtensions?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L78)

***

### exclusions?

> `optional` **exclusions?**: `string`[]

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L76)

***

### experimentalFragmentArguments?

> `optional` **experimentalFragmentArguments?**: `boolean`

Defined in: node\_modules/graphql/language/parser.d.mts:42

EXPERIMENTAL:

If enabled, the parser will understand and parse fragment variable definitions
and arguments on fragment spreads. Fragment variable definitions will be represented
in the `variableDefinitions` field of the FragmentDefinitionNode.
Fragment spread arguments will be represented in the `arguments` field of FragmentSpreadNode.

#### Example

```graphql prettier-ignore
{
  t { ...A(var: true) }
}
fragment A($var: Boolean = false) on T {
  ...B(x: $var)
}
```

#### Inherited from

`ParseOptions.experimentalFragmentArguments`

***

### forceSchemaDefinition?

> `optional` **forceSchemaDefinition?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L42)

Creates schema definition, even when no types are available
Produces: `schema { query: Query }`

Default: false

***

### ignoreFieldConflicts?

> `optional` **ignoreFieldConflicts?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L80)

***

### lexer?

> `optional` **lexer?**: `LexerInterface`

Defined in: node\_modules/graphql/language/parser.d.mts:48

**`Internal`**

Internal parser hook for GraphQL.js entry points that need to parse a
restricted grammar with an alternate lexer.

#### Inherited from

`ParseOptions.lexer`

***

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: node\_modules/graphql/language/parser.d.mts:24

Parser CPU and memory usage is linear to the number of tokens in a document
however in extreme cases it becomes quadratic due to memory exhaustion.
Parsing happens before validation so even invalid queries can burn lots of
CPU time and memory.
To prevent this you can set a maximum number of tokens allowed within a document.

#### Inherited from

`ParseOptions.maxTokens`

***

### noLocation?

> `optional` **noLocation?**: `boolean`

Defined in: node\_modules/graphql/language/parser.d.mts:16

By default, the parser creates AST nodes that know the location
in the source that they correspond to. This configuration flag
disables that behavior for performance or testing.

#### Inherited from

`ParseOptions.noLocation`

***

### onFieldTypeConflict?

> `optional` **onFieldTypeConflict?**: [`OnFieldTypeConflict`](/docs/api/merge/src/type-aliases/onfieldtypeconflict)

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:101](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L101)

Called if types of the same fields are different

Default: false

@example:
Given:
```graphql
 type User { a: String }
 type User { a: Int }
```

Instead of throwing `already defined with a different type` error,
`onFieldTypeConflict` function is called.

***

### pathToDirectivesInExtensions?

> `optional` **pathToDirectivesInExtensions?**: `string`[]

Defined in: [packages/utils/src/types.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L24)

#### Inherited from

[`GetDocumentNodeFromSchemaOptions`](/docs/api/utils/src/interfaces/getdocumentnodefromschemaoptions).[`pathToDirectivesInExtensions`](/docs/api/utils/src/interfaces/getdocumentnodefromschemaoptions#pathtodirectivesinextensions)

***

### repeatableLinkImports?

> `optional` **repeatableLinkImports?**: `Set`\<`string`\>

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L85)

Allow directives that are not defined in the schema, but are imported
through federated @links, to be repeated.

***

### reverseArguments?

> `optional` **reverseArguments?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:102](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L102)

***

### reverseDirectives?

> `optional` **reverseDirectives?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L75)

Puts the next directive first.

Default: false

@example:
Given:
```graphql
 type User { a: String @foo }
 type User { a: String @bar }
```

Results:
```
 type User { a: @bar @foo }
```

***

### sort?

> `optional` **sort?**: `boolean` \| [`CompareFn`](/docs/api/merge/src/type-aliases/comparefn)\<`string`\>

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L77)

***

### throwOnConflict?

> `optional` **throwOnConflict?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L48)

Throws an error on a merge conflict

Default: false

***

### useSchemaDefinition?

> `optional` **useSchemaDefinition?**: `boolean`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:35](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L35)

Produces `schema { query: ..., mutation: ..., subscription: ... }`

Default: true
