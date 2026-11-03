---
'@graphql-tools/merge': major
---

`mergeEnumValues` now follows the same rule as `mergeEnum` and `mergeFields`: existing values stay first, incoming description and directives win.

Two documents, merged left to right. Same enum name, different text and values:

```graphql
# document 1
"""Color from users"""
enum Color {
  """old red"""
  RED @a
  GREEN
}

# document 2
"""Color from billing"""
enum Color {
  """new red"""
  RED @b
  BLUE
}
```

Previously the merged type mixed the two documents. Type text came from document 2, `RED` text and the value list came from the opposite direction:

```graphql
"""Color from billing"""
enum Color {
  """old red"""
  RED @b @a
  BLUE
  GREEN
}
```

Now type and values use the same rule. Document 2 wins descriptions and directives. Document 1 keeps the value order; values that exist only in document 2 are appended:

```graphql
"""Color from billing"""
enum Color {
  """new red"""
  RED @a @b
  GREEN
  BLUE
}
```

`consistentEnumMerge` is removed. It was an opt-in swap that already produced this result; that behavior is now the default.
