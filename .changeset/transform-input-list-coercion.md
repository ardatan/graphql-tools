---
'@graphql-tools/utils': patch
---

`transformInputValue` now keeps falsy list items when GraphQL coerces a singleton into a list.

A `[String]` / `[Int]` / `[Boolean]` field can receive `""`, `0`, or `false` instead of a one-element array. The previous `asArray` helper treated those as empty and produced `[]`, so rename and other input transforms dropped a valid value. `null` is still returned as-is. A real list is still walked item by item.
