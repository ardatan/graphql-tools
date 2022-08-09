---
'@graphql-tools/delegate': major
'@graphql-tools/wrap': major
---

Breaking changes;

**Schema generation optimization by removing `transfomedSchema` parameter**

Previously we were applying the transforms multiple times. We needed to introduced some breaking changes to improve the initial wrapped/stitched schema generation performance;

- `Transform.transformSchema` no longer accepts `transformedSchema` which can easily be created with `applySchemaTransforms(schema, subschemaConfig)` instead.
- Proxying resolver factory function that is passed as `createProxyingResolver` to `SubschemaConfig` no longer takes `transformedSchema` which can easily be created with `applySchemaTransforms(schema, subschemaConfig)` instead.

**`stitchSchemas` doesn't take nested arrays of subschemas**

`stitchSchemas` no longer accepts an array of arrays of subschema configuration objects. Instead, it accepts an array of subschema configuration objects or schema objects directly.

**`stitchSchemas` no longer prunes the schema with `pruningOptions`**

You can use `pruneSchema` from `@graphql-tools/utils` to prune the schema instead.

**`stitchSchemas` no longer respect "@computed" directive if stitchingDirectivesTransformer isn't applied**

Also `@graphql-tools/stitch` no longer exports `computedDirectiveTransformer` and `defaultSubschemaConfigTransforms`.
Instead, use `@graphql-tools/stitching-directives` package for `@computed` directive.
[Learn more about setting it up](https://www.graphql-tools.com/docs/schema-stitching/stitch-directives-sdl#directives-glossary)

**`computedFields` has been removed from the merged type configuration**

`MergeTypeConfig.computedFields` setting has been removed in favor of new computed field configuration written as:

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
