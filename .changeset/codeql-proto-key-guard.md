---
'@graphql-tools/utils': patch
---

Compare incremental path keys to `__proto__` at the property access in `setObjectKeyPath`, in addition to the existing `isSafeObjectKey` check.
