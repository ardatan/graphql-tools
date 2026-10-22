---
'@graphql-tools/schema': patch
---

`requireResolversForArgs` (and the other resolver-presence checks) now treat a field `subscribe` function as a resolver.

Subscription fields usually only define `subscribe`, not `resolve`. The validator used to look only at `field.resolve`, so a subscription with arguments was reported as missing even when `subscribe` was present.
