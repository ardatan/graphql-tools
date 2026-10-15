---
'@graphql-tools/utils': patch
---

Keep argument types of defined directives when pruning so that unused directives such as `@key(fields: _FieldSet!)` retain their full definitions instead of losing the argument together with its type.
