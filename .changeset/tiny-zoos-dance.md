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