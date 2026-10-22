---
'@graphql-tools/utils': patch
---

Directive argument defaults now go through the same serialize/parse path as field arguments, so a remapped enum default (`@auth(role: UserRole = USER)`) is the internal enum value.
