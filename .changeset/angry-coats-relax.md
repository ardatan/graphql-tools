---
'@graphql-tools/delegate': patch
'@graphql-tools/stitch': patch
---

fix(stitch): type merging for nested root types

Because root types do not usually require selectionSets, a nested root type proxied to a remote service may end up having an empty selectionSet, if the nested root types only includes fields from a different subservice.

Empty selection sets return null, but, in this case, it should return an empty object. We can force this behavior by including the \_\_typename field which exists on every schema.

Addresses #2347.

In the future, we may want to include short-circuiting behavior that when delegating to composite fields, if an empty selection set is included, an empty object is returned rather than null. This short-circuiting behavior would be complex for lists, as it would be unclear the length of the list...
