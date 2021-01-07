---
'@graphql-tools/stitch': patch
'@graphql-tools/stitching-directives': patch
'@graphql-tools/utils': patch
---

enhance(stitching-directives): use keyField

When using simple keys, i.e. when using the keyField argument to `@merge`, the keyField can be added implicitly to the types's key. In most cases, therefore, `@key` should not be required at all.
