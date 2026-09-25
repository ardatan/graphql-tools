---
'@graphql-tools/utils': patch
'@graphql-tools/merge': patch
'@graphql-tools/mock': patch
---

Fix prototype pollution in `mergeIncrementalResult`

Path segments are now rejected unless they are primitive strings or numbers, and keys named `__proto__`, `constructor` or `prototype` are still blocked. Previously a non-primitive segment such as `["__proto__"]` bypassed the string equality guard and was coerced into a write on `Object.prototype`.

Also exports shared `isSafeObjectKey` / `isDangerousObjectKey` helpers used by this path walker and other package call sites. `@graphql-tools/merge` and `@graphql-tools/mock` are patched so they ship with the new imports; `updateInternalDependencies` raises their utils floor when `12.0.2` is versioned.
