---
'@graphql-tools/prisma-loader': patch
---

Don't initialize env vars with an empty object, so it can fall back on process.env
