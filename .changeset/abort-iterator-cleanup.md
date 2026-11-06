---
'@graphql-tools/executor': patch
---

Ignore synchronous throws and asynchronous rejections from iterator cleanup during abort so all
registered list and subscription sources can be closed without unhandled cleanup errors.
