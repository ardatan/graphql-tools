---
'@graphql-tools/federation': major
---

BREAKING CHANGES:
- `getSubschemasFromSupergraphSdl` has been removed in favor of the new `getStitchingOptionsFromSupergraphSdl`, and it returns the options for `stitchSchemas` instead of the map of subschemas
- `onExecutor` has been removed in favor of `onSubschemaConfig`
- To change the default HTTP executor options, use `httpExecutorOpts` instead of `onExecutor`

