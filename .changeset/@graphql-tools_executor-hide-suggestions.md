---
'@graphql-tools/executor': minor
---

Support `hideSuggestions` on `ExecutionArgs` and pass it through variable coercion so "Did you mean" suggestions can be omitted from invalid variable errors, matching `graphql@17`.
