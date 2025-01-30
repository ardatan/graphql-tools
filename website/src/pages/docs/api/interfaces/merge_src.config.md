[graphql-tools-monorepo](../README) / [merge/src](../modules/merge_src) / Config

# Interface: Config

[merge/src](../modules/merge_src).Config

## Hierarchy

- `ParseOptions`

- [`GetDocumentNodeFromSchemaOptions`](utils_src.GetDocumentNodeFromSchemaOptions)

  ↳ **`Config`**

## Table of contents

### Properties

- [allowLegacyFragmentVariables](merge_src.Config#allowlegacyfragmentvariables)
- [commentDescriptions](merge_src.Config#commentdescriptions)
- [consistentEnumMerge](merge_src.Config#consistentenummerge)
- [convertExtensions](merge_src.Config#convertextensions)
- [exclusions](merge_src.Config#exclusions)
- [forceSchemaDefinition](merge_src.Config#forceschemadefinition)
- [ignoreFieldConflicts](merge_src.Config#ignorefieldconflicts)
- [maxTokens](merge_src.Config#maxtokens)
- [noLocation](merge_src.Config#nolocation)
- [onFieldTypeConflict](merge_src.Config#onfieldtypeconflict)
- [pathToDirectivesInExtensions](merge_src.Config#pathtodirectivesinextensions)
- [reverseArguments](merge_src.Config#reversearguments)
- [reverseDirectives](merge_src.Config#reversedirectives)
- [sort](merge_src.Config#sort)
- [throwOnConflict](merge_src.Config#throwonconflict)
- [useSchemaDefinition](merge_src.Config#useschemadefinition)

## Properties

### allowLegacyFragmentVariables

• `Optional` **allowLegacyFragmentVariables**: `boolean`

**`Deprecated`**

will be removed in the v17.0.0

If enabled, the parser will understand and parse variable definitions contained in a fragment
definition. They'll be represented in the `variableDefinitions` field of the FragmentDefinitionNode.

The syntax is identical to normal, query-defined variables. For example:

```graphql
fragment A($var: Boolean = false) on T {
  ...
}
```

#### Inherited from

ParseOptions.allowLegacyFragmentVariables

#### Defined in

node_modules/graphql/language/parser.d.ts:90

---

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Descriptions are defined as preceding string literals, however an older experimental version of the
SDL supported preceding comments as descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L56)

---

### consistentEnumMerge

• `Optional` **consistentEnumMerge**: `boolean`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L78)

---

### convertExtensions

• `Optional` **convertExtensions**: `boolean`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L77)

---

### exclusions

• `Optional` **exclusions**: `string`[]

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L75)

---

### forceSchemaDefinition

• `Optional` **forceSchemaDefinition**: `boolean`

Creates schema definition, even when no types are available Produces: `schema { query: Query }`

Default: false

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L41)

---

### ignoreFieldConflicts

• `Optional` **ignoreFieldConflicts**: `boolean`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L79)

---

### maxTokens

• `Optional` **maxTokens**: `number`

Parser CPU and memory usage is linear to the number of tokens in a document however in extreme cases
it becomes quadratic due to memory exhaustion. Parsing happens before validation so even invalid
queries can burn lots of CPU time and memory. To prevent this you can set a maximum number of tokens
allowed within a document.

#### Inherited from

ParseOptions.maxTokens

#### Defined in

node_modules/graphql/language/parser.d.ts:74

---

### noLocation

• `Optional` **noLocation**: `boolean`

By default, the parser creates AST nodes that know the location in the source that they correspond
to. This configuration flag disables that behavior for performance or testing.

#### Inherited from

ParseOptions.noLocation

#### Defined in

node_modules/graphql/language/parser.d.ts:66

---

### onFieldTypeConflict

• `Optional` **onFieldTypeConflict**:
[`OnFieldTypeConflict`](../modules/merge_src#onfieldtypeconflict)

Called if types of the same fields are different

Default: false

@example: Given:

```graphql
type User {
  a: String
}
type User {
  a: Int
}
```

Instead of throwing `already defined with a different type` error, `onFieldTypeConflict` function is
called.

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L95)

---

### pathToDirectivesInExtensions

• `Optional` **pathToDirectivesInExtensions**: `string`[]

#### Inherited from

[GetDocumentNodeFromSchemaOptions](utils_src.GetDocumentNodeFromSchemaOptions).[pathToDirectivesInExtensions](utils_src.GetDocumentNodeFromSchemaOptions#pathtodirectivesinextensions)

#### Defined in

[packages/utils/src/types.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L23)

---

### reverseArguments

• `Optional` **reverseArguments**: `boolean`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L96)

---

### reverseDirectives

• `Optional` **reverseDirectives**: `boolean`

Puts the next directive first.

Default: false

@example: Given:

```graphql
type User {
  a: String @foo
}
type User {
  a: String @bar
}
```

Results:

```
 type User { a: @bar @foo }
```

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L74)

---

### sort

• `Optional` **sort**: `boolean` \| [`CompareFn`](../modules/merge_src#comparefn)\<`string`>

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L76)

---

### throwOnConflict

• `Optional` **throwOnConflict**: `boolean`

Throws an error on a merge conflict

Default: false

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L47)

---

### useSchemaDefinition

• `Optional` **useSchemaDefinition**: `boolean`

Produces `schema { query: ..., mutation: ..., subscription: ... }`

Default: true

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L34)
