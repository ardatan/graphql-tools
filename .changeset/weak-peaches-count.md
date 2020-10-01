---
'@graphql-tools/delegate': major
'@graphql-tools/stitch': major
'@graphql-tools/utils': major
'@graphql-tools/wrap': major
'@graphql-tools/links': patch
'@graphql-tools/merge': patch
'@graphql-tools/schema': patch
---

Breaking Changes:
- Delegation result: ExternalObject concept formalized and matured, resulting in deprecation of slicedError, getErrors, getErrorsByPathSegment functions, see new getUnpathedErrors function for errors that cannot be merged into the ExternalObject. See as well new annotateExternalObject and mergeExternalObjects functions. Rename handleResult to resolveExternalValue.

- Transforms: transforms now take delegationContext and transformationContext arguments within their transformRequest/Result methods. the transformSchema method may wish to create additional delegating resolvers and so it takes the subschemaConfig, transforms, and (non-executable) transformed schema as optional parameters. Transform types and applySchemaTransforms now within delegate package; applyRequest/ResultTransforms functions deprecated.

- Wrapping schema standardization: remove support for createMergedResolver and non-standard transforms where resolvers do not use defaultMergedResolver. This is still possible, but not supported out of the box due to conflicts with type merging, where resolvers expected to be identical across subschemas.

- Stitching: stitchSchemas's mergeTypes option is now true by result, causing types to be merged and the onTypeConflict option to be ignored. To use onTypeConflict again to select a specific type instead of merging, set mergeTypes to false. Removed support for fragment hints in favor of selection set hints.

- API Pruning: remove support for ExtendSchema transform with wrapSchema, simpler just to use stitchSchemas with one subschema. Trim utils package size: remove unused fieldNodes utility functions, remove unused typeContainsSelectionSet function, move typesContainSelectionSet to stitch package

Related Issues

- proxy all the errors: #1047, #1641
- better error handling for merges #2016, #2062
- fix typings #1614
- disable implicit schema pruning #1817
