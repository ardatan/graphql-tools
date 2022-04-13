---
'@graphql-tools/delegate': patch
---

relax subschema error path check

...as (apparently) some implementations may return path as `null` rather than not returning a path.
