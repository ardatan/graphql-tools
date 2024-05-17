---
"@graphql-tools/stitch": patch
---

If there is a subschema with some selection set, and another with some other selection set.
After the calculation of delegation stage, if one subschema can cover the other selection set as well, then we can merge the two selection sets into one, and remove the other subschema from the stage.

