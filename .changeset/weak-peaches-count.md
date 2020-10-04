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
- Delegation result: `ExternalObject` concept formalized and matured, resulting in deprecation of `slicedError`, `getErrors`, `getErrorsByPathSegment` functions, see new `getUnpathedErrors` function for errors that cannot be merged into the `ExternalObject`. See as well new `annotateExternalObject` and `mergeExternalObjects` functions. Rename `handleResult` to `resolveExternalValue`.

- Transforms: `transformRequest`/`transformResult` methods are now provided additional `delegationContext` and `transformationContext` arguments -- these were previously optional. The `transformSchema` method may wish to create additional delegating resolvers and so it is now provided the `subschemaOrSubschemaConfig`, `transforms`, and (non-executable) `transformedSchema` as optional parameters. `transformSchema` is kicked off once to produce the non-executable version, and then a second time with the `transformedSchema` parameter set to the result of the first one so an executable version can be produced with the necessary information for any new proxying resolvers. Transform types and the `applySchemaTransforms` are now within delegate package; `applyRequestTransforms`/`applyResultTransforms` functions have been deprecated, however, as this is done by the `Transformer` abstraction.

- Wrapping: remove support for `createMergedResolver` and non-standard transforms where resolvers do not use `defaultMergedResolver`. This is still theoretically possible, but not supported out of the box due to conflicts with type merging, where resolvers expected to be identical across subschemas. Remove custom `wrappingResolver` option from WrapFields as this does not make sense in the context of planned functionality to wrap subscription root fields in potentially multiple layers, as the wrapping resolvers will have to be different for the root field and the other layers. Modifying resolvers can be performed using a later transform such as `TransformRootFields` or `TransformObjectFields`.

- Stitching: `stitchSchemas`'s `mergeTypes` option is now true by default, causing types to be merged and the `onTypeConflict` option to be ignored. To use `onTypeConflict` to again select a specific type instead of merging, set `mergeTypes` to false. Removed support for fragment hints in favor of selection set hints.

- Utils: `filterSchema`'s `fieldFilter` will now filter *all* fields across Object, Interface, and Input types. For the previous Object-only behavior, switch to the `objectFieldFilter` option.

- API Pruning: remove support for `ExtendSchema` transform , simpler just to use `stitchSchemas` with one subschema. Trim `utils` package size: remove unused `fieldNodes` utility functions, remove unused `typeContainsSelectionSet` function, move `typesContainSelectionSet` to stitch package. Remove `Operation` type in favor of `OperationTypeNode` from upstream graphql-js.

Related Issues

- proxy all the errors: #1047, #1641
- better error handling for merges #2016, #2062
- fix typings #1614
- disable implicit schema pruning #1817
