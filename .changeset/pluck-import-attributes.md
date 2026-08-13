---
'@graphql-tools/graphql-tag-pluck': patch
---

Parse with Babel `importAttributes` (and `deprecatedAssertSyntax` so existing `assert { … }` files still work), and drop the unused `@babel/plugin-syntax-import-assertions` dependency. Fixes #5454.
