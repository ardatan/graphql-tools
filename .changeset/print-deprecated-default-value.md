---
'@graphql-tools/utils': patch
---

Print argument and input field defaults configured with the deprecated `defaultValue` on graphql 17.

graphql 17 leaves `default` undefined for those, so `printSchemaWithDirectives` dropped the default.
