---
'@graphql-tools/delegate': patch
'@graphql-tools/stitch': patch
---

fix(stitch): fix mergeExternalObject regressions

v7 introduced a regression in the merging of ExternalObjects that causes type merging to fail when undergoing multiple rounds of merging.
