---
"@graphql-tools/stitch": patch
---

Support computed fields resolved via a root field returning an interface
When a computed field returning an object, and that field is resolved via an interface, the computed field will now be resolved correctly.

