---
'@graphql-tools/utils': major
---

Fix the bug in `mergeDeep` but it might be a breaking change;

The following inputs and outputs are corrected;

- `mergeDeep([{a:2}, undefined])` - Any nullish values should be ignored so it should return `{a:2}`
- `mergeDeep([])` - no sources should return `undefined`
- `mergeDeep([undefined])` - no sources should return `undefined`
