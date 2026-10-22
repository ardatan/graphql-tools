---
'@graphql-tools/schema': patch
---

`requireResolversForArgs` (and the other resolver-presence checks) now look for `subscribe` on the schema's subscription type.

On subscriptions, `subscribe` is required and `resolve` is optional. The validator used to look only at `field.resolve`, so a subscription with arguments was reported as missing even when `subscribe` was present. Query and mutation fields still require `resolve`.
