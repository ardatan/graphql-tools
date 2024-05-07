---
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": patch
---

If there are some fields depending on a nested type resolution, wait until it gets resolved then resolve the rest.

See packages/federation/test/fixtures/complex-entity-call example for more details.
You can see `ProductList` needs some fields from `Product` to resolve `first`
