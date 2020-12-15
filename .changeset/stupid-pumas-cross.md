---
'@graphql-tools/delegate': patch
---

fix(delegate): resolve external values only once

Because items in a list may be identical and the defaultMergedResolver mutates those objects when resolving them as external values, a check is required so that the mutation happens only once.

Partially addresses #2304
