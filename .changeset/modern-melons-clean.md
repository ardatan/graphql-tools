---
"@graphql-tools/merge": patch
"@graphql-tools/stitch": minor
---

Introduces a suite of stitched schema validations that enforce the integrity of merged schemas. This includes validations for:

- Strict and safe null consistency (the later of which allows safe transitions in nullability).
- Named type consistency with the option to whitelist proxiable scalar mappings.
- Argument and input field name consistency.
- Enum value consistency when used as an input value.

Validations may be adjusted by setting `validationLevel` to `off|warn|error` globally  or scoped for specific types and fields. In this initial v7 release, all validations are introduced at the `warn` threshold for backwards compatibility. Most of these validations will become automatic errors in v8. To enable validation errors now, set `validationLevel: 'error'`. Full configuration options look like this:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [...],
  typeMergingOptions: {
    validationSettings: {
      validationLevel: 'error',
      strictNullComparison: false, // << gateway "String" may proxy subschema "String!"
      proxiableScalars: {
        ID: ['String'], // << gateway "ID" may proxy subschema "String"
      }
    },
    validationScopes: {
      // scope to specific element paths
      'User.id': {
        validationLevel: 'warn',
        strictNullComparison: true,
      },
    }
  },
});
```
