---
'@graphql-tools/documents': patch
---

Drop `lodash.sortby` from `@graphql-tools/documents` by replacing internal sorting usage with native `Array.prototype.sort`.
