---
'@graphql-tools/merge': major
---

`mergeEnumValues` now follows the same rule as `mergeEnum` and `mergeFields`: existing values stay first, incoming description and directives win.

`mergeTypeDefs` / `mergeGraphQLNodes` walk definitions left to right and call `mergeEnum(next, existing)`. The enum type already took `next.description || existing.description` and `mergeDirectives(next, existing)`. Enum values did the opposite: `existing.description || next.description`, incoming values first, and `mergeDirectives(existing, next)`. Merging two enums that both describe `RED` kept the type text from the later SDL and the value text from the earlier one.

```graphql
"""first type"""
enum Color {
  """first value"""
  RED @a
  GREEN
}

"""second type"""
enum Color {
  """second value"""
  RED @b
  BLUE
}
```

Previously: type `second type`, values `RED, BLUE, GREEN`, value text `first value`, value directives `@b` then `@a`.
Now: type `second type`, values `RED, GREEN, BLUE`, value text `second value`, value directives `@a` then `@b`.

`consistentEnumMerge` is removed. It was an opt-in swap that already produced this result; that behavior is now the default.
