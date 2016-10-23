### v0.8.0

* Update default resolve function to match the one from GraphQL.js ([@stubailo](https://github.com/stubailo) in [#183](https://github.com/apollostack/graphql-tools/pull/183))
* Move `typed-graphql` to `optionalDependencies` ([@stubailo](https://github.com/stubailo) in [#183](https://github.com/apollostack/graphql-tools/pull/183))
* Set new defaults for resolver validation to match GraphQL.js so that developers need to opt-in to advanced validation ([@stubailo](https://github.com/stubailo) in [#183](https://github.com/apollostack/graphql-tools/pull/183)):
    * `requireResolversForArgs = false`
		* `requireResolversForNonScalar = false`

### v0.7.2

* Eliminated babel and moved to native ES5 compilation. ([@DxCx](https://github.com/DxCx) in [#147](https://github.com/apollostack/graphql-tools/pull/147))

### v0.7.1

* Fix dependency on lodash

### v0.7.0
* Various Bugfixes ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))
	- Istanbul coverage was not working well due to Istanbul bug [#549](https://github.com/gotwarlost/istanbul/issues/549)
	- Bluebird promise was not converted well on tests
	- "console.warn" got overwritten on tests

* Migrated code from Javascript to Typescript ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Deprecated addConnectorsToContext ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Removed deprecated aplloServer ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Removed testing on Node 5 ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Changed GraphQL typings requirment from peer to standard ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Change the missing resolve function validator to show a warning instead of an error ([@nicolaslopezj](https://github.com/nicolaslopezj) in [#134](https://github.com/apollostack/graphql-tools/pull/134))

* Add missing type annotations to avoid typescript compiler errors when 'noImplicitAny' is enabled ([@almilo](https://github.com/almilo) in [#133](https://github.com/apollostack/graphql-tools/pull/133))

### v0.6.6
* Added embedded Typescript definitions ([@DxCx](https://github.com/DxCx) in [#120](https://github.com/apollostack/graphql-tools/pull/120))

* Fix issue in addMockFunctionsToSchema when preserveResolvers is true and connector/logger is used. ([@DxCx](https://github.com/DxCx) in [#121](https://github.com/apollostack/graphql-tools/pull/121))

* Fix multiple issues in addMockFunctionsToSchema when preserveResolvers is true (support for Promises, and props defined using Object.defineProperty) ([@sebastienbarre](https://github.com/sebastienbarre) in [#115](https://github.com/apollostack/graphql-tools/pull/115))

* Make allowUndefinedInResolve true by default ([@jbaxleyiii](https://github.com/jbaxleyiii) in [#117](https://github.com/apollostack/graphql-tools/pull/117))

* Add `requireResolversForAllFields` resolver validation option ([@nevir](https://github.com/nevir) in [#107](https://github.com/apollostack/graphql-tools/pull/107))

### v0.6.4
* Make mocking partial objects match expected behavior ([@sebastienbarre](https://github.com/sebastienbarre) in [#96](https://github.com/apollostack/graphql-tools/pull/96))
* Improved behavior when mocking interfaces & unions ([@itajaja](https://github.com/itajaja) in [#102](https://github.com/apollostack/graphql-tools/pull/102))

### v0.6.3

* Unpin babel-core version to solve build problem (PR #92)
* Added support for `extend` keyword to schemaGenerator https://github.com/apollostack/graphql-tools/pull/90

### v0.6.2

* Fix a bug with addSchemaLevelResolveFunction. It now runs once per tick (PR #91)

### v0.5.2

* Add addSchemaLevelResolveFunction to exports
* Remove dist folder before prepublish to make sure files deleted in source are not included in build

### v0.5.1

* Updated GraphQL dependency to 0.6.0
* Removed all tracer code, including `Tracer`, `addTracingToResolvers` and `decorateWithTracer`
