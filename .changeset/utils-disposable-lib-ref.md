---
'@graphql-tools/utils': patch
---

Published `Executor` types reference `esnext.disposable` so apps using `lib` like `es2022` or `es2024` do not need `skipLibCheck` or a full `esnext` lib.

The repo tsconfig now uses `lib: ["es2024"]` instead of `["esnext"]`. `esnext.disposable` comes from the `executor.ts` triple-slash reference.
