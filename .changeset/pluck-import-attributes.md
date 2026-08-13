---
'@graphql-tools/graphql-tag-pluck': patch
---

Migrate Babel import syntax plugin from `importAssertions` to `importAttributes` (with `deprecatedAssertSyntax` so existing `assert { … }` files still parse). Fixes #5454.
