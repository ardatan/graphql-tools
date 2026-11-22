---
'@graphql-tools/executor': patch
---

When variable `@skip` / `@include` appear only on Field nodes, compile a selection program once and filter with cheap predicates instead of re-collecting on every execution. Fragment-level skip/include and `@defer` / `@stream` keep the classic collect path.
