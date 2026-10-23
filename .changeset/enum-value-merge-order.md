---
'@graphql-tools/merge': patch
---

`mergeEnumValues` now applies description and directives from the same candidate as `mergeEnum`.

`mergeTypeDefs` / `mergeGraphQLNodes` walk definitions left to right and call `mergeEnum(next, existing)`. The enum type already took `next.description || existing.description` and `mergeDirectives(next, existing)`. Enum values did the opposite: `existing.description || next.description` and `mergeDirectives(existing, next)`. Merging two enums that both describe `RED` kept the type text from the later SDL and the value text from the earlier one.

```graphql
"""first type"""
enum Color {
  """first value"""
  RED @a
}

"""second type"""
enum Color {
  """second value"""
  RED @b
}
```

Previously: type `second type`, value `first value`, value directives `@b` then `@a`.
Now: type `second type`, value `second value`, value directives `@a` then `@b`, same as the enum type and as object field merges.

`consistentEnumMerge` is ignored. It only swapped the value arrays to paper over this; the default path matches that intent.
