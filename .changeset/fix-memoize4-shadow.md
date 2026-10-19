---
'@graphql-tools/utils': patch
---

fix(utils): stop shadowing `cache4` in `memoize4` so partial cache hits do not throw
