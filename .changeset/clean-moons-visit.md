---
"@graphql-tools/utils": patch
---

Adds a `flatRepeatable` option to the `getDirectives` method. Enabling this setting will return a flat array of repeatable directives, versus the current nested result with duplicative records. This flat parsing will become the new result in a future major version.
