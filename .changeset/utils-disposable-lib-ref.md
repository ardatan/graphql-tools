---
'@graphql-tools/utils': patch
---

Published `Executor` types include `/// <reference lib="esnext.disposable" preserve="true" />` so consumers do not need `skipLibCheck` or a full `esnext` lib just to import this package.

Use case: an app with `"lib": ["es2022"]` or `["es2024"]` and `skipLibCheck: false` that imports `@graphql-tools/utils`:

```ts
import type { Executor } from '@graphql-tools/utils';

export const executor: Executor = async request => {
  // ...
};
```

`Executor` can return a `Disposable` / `AsyncIterable` result. Those names live in TypeScript's `esnext.disposable` lib, which is not part of `es2022`/`es2024`. Without the preserved reference, `tsc` reports `Cannot find name 'Disposable'`. With it, the published `.d.ts` pulls in that lib for the consumer automatically.
