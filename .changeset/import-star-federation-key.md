---
'@graphql-tools/import': patch
---

`# import *` keeps unreferenced types that carry a federation `@key` (subgraph entities). Other unused types are still tree-shaken, matching existing `import *` tests.
