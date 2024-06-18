---
'@graphql-tools/federation': minor
---

Add a the ability to start polling with a delay. This ease the handling of failure handling,
allowing to restart the manager and respecting GraphOS minimum retry delay.
