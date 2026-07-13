---
'@graphql-tools/executor': patch
---

Forward `info.getAsyncHelpers().track()` to `context.waitUntil` when present so tracked async work stays alive under Yoga (and similar runtimes).
