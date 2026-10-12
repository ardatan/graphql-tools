---
'@graphql-tools/utils': patch
---

Skip empty and whitespace-only `description` values in `getDescriptionNode` / `printSchemaWithDirectives`, so loaders that set `description: ""` no longer emit `""""""` in printed SDL.
