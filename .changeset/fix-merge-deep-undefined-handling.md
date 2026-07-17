---
'@graphql-tools/utils': patch
---

fix mergeDeep to treat explicit undefined property values as overrides rather than skipping them, distinct from an absent property
