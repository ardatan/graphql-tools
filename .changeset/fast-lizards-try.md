---
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": minor
"@graphql-tools/stitching-directives": minor
---

Deprecates the `MergeTypeConfig.computedFields` setting (with backwards-compatible warning) in favor of new computed field configuration written as:

```js
merge: {
  MyType: {
    fields: {
      myComputedField: {
        selectionSet: '{ weight }',
        computed: true,
      }
    }
  }
}
```

A field-level `selectionSet` specifies field dependencies while the `computed` setting structures the field in a way that assures it is always selected with this data provided. The `selectionSet` is intentionally generic to support possible future uses. This new pattern organizes all field-level configuration (including `canonical`) into a single structure.
