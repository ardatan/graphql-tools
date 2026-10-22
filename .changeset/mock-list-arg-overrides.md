---
'@graphql-tools/mock': patch
---

Mocks set on list items now apply to fields that take arguments.

The store keys a field with its arguments (`membership:{"param":"test"}`). Nested mocks such as `{ membership: null }` were stored under the bare field name, so a query that passed arguments generated a new default instead of using the override. Lookups now fall back to the un-argued field when the exact argument key is missing.
