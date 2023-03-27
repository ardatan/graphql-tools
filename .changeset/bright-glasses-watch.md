---
'@graphql-tools/delegate': patch
---

Create symbols with Symbol.for() because multiple copies of delegate cause stitching bugs otherwise.
