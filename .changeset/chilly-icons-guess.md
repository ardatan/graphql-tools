---
'@graphql-tools/utils': patch
---

Fix the bug in `mergeDeep`;

The following inputs and outputs are corrected;

- `mergeDeep([{a:2}, undefined])` - Any nullish values should be ignored so it should return `{a:2}`
- `mergeDeep([])` - no sources should return `undefined`
- `mergeDeep([undefined])` - no sources should return `undefined`
