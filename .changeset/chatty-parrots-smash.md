---
'@graphql-tools/delegate': minor
'@graphql-tools/stitch': minor
'@graphql-tools/batch-execute': patch
---

refactor(delegationPlanner): introduce static version of our piecemeal planner

...which, although undocumented, can be accessed within the StitchingInfo object saved in a stitched schema's extensions.

Also improves memoization technique slightly across the board.
