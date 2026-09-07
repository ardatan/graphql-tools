---
'@graphql-tools/utils': patch
---

Fix prototype pollution in `mergeDeep`

Source keys named `__proto__`, `constructor` or `prototype` are now skipped at every recursion level, and the check for an existing key uses `hasOwnProperty` instead of `in`, so inherited properties are never used as merge targets.

Previously, merging untrusted data such as `JSON.parse('{"constructor":{"__proto__":{"call":"x"}}}')` could reach and overwrite properties on `Object.prototype` or `Function.prototype`.
