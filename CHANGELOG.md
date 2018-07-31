# Change log

### vNEXT

* Loosens the apollo-link dependency [PR #765](https://github.com/apollographql/graphql-tools/pull/765)
* Use `getDescription` from `graphql-js` package [PR #672](https://github.com/apollographql/graphql-tools/pull/672)
* Update `IResolvers` to use source & context generics and to support all resolver use cases. [#896](https://github.com/apollographql/graphql-tools/pull/896)
* `WrapQuery`'s `wrapper` param can now return a SelectionSet. [PR #902](https://github.com/apollographql/graphql-tools/pull/902) [Issue #901](https://github.com/apollographql/graphql-tools/issues/901)
* Add null to return type of directive visitors in the TypeScript definition.
* Make sure mergeSchemas keeps Enum descriptions and deprecation status. [PR 898](https://github.com/apollographql/graphql-tools/pull/898/)
* Add `inheritResolversFromInterfaces` option to `mergeSchemas` [PR #812](https://github.com/apollographql/graphql-tools/pull/812)
* Added filtering of empty selection sets in FilterToSchema [#827](https://github.com/apollographql/graphql-tools/pull/827)

### v3.0.5

* Update apollo-link to 1.2.2 [#785](https://github.com/apollographql/graphql-tools/pull/785)

### v3.0.4

* Make sure `dist/generate` isn't excluded when published.

### v3.0.3

* Pass on operation name when stitching schemas.
  [Issue #522](https://github.com/apollographql/graphql-tools/issues/522)
  [PR #849](https://github.com/apollographql/graphql-tools/pull/849)
* Fixed errors that occurred when a fragment field argument used a variable
  defined in the parent query.
  [Issue #753](https://github.com/apollographql/graphql-tools/issues/753)
  [PR #806](https://github.com/apollographql/graphql-tools/pull/806)

### v3.0.2

* Fixed duplicate fragments getting added during transform in `FilterToSchema` [#778](https://github.com/apollographql/graphql-tools/pull/778)
* Fixed a visitType error printing the name of the variable typeName rather than its value due to a template string being incorrectly formatted. [#783](https://github.com/apollographql/graphql-tools/pull/783)

### v3.0.1

* Fixed an array cloning bug in the `RenameTypes` transform
  [#756](https://github.com/apollographql/graphql-tools/pull/756)

* Fixed a fragments bug in the `ReplaceFieldWithFragment` transform
  [#763](https://github.com/apollographql/graphql-tools/pull/763)

### v3.0.0

* Schema transforms and delegation
  * Substantial rewrite of internals of `mergeSchemas` and `delegateToSchema`
  * A new API for schema transforms has been introduced: [Docs](https://www.apollographql.com/docs/graphql-tools/schema-transforms.html)
  * `delegateToSchema` is now a public API: [Docs](https://www.apollographql.com/docs/graphql-tools/schema-delegation.html)
  * `delegateToSchema` now accepts an object of named parameters; positional arguments are deprecated
  * `delegateToSchema` no longer accepts `fragmentReplacements`; instead use `transforms`
  * `info.mergeInfo.delegateToSchema` is now the preferred delegation API, rather than `info.mergeInfo.delegate`

* Other changes
  * Add `commentDescription` to `printSchema` call to match other uses [PR #745](https://github.com/apollographql/graphql-tools/pull/745)
  * Add `createResolver` option to `makeRemoteExecutableSchema` [PR #734](https://github.com/apollographql/graphql-tools/pull/734)

### v2.24.0

* Allow `extend interface` definitions in merged schemas [PR #703](https://github.com/apollographql/graphql-tools/pull/703)
* Fix typo in `@deprecated` example in `schema-directives.md` [PR #706](https://github.com/apollographql/graphql-tools/pull/706)
* Fix timezone bug in test for `@date` directive [PR #686](https://github.com/apollographql/graphql-tools/pull/686)
* Expose `defaultMergedResolver` for schema stitching [PR #685](https://github.com/apollographql/graphql-tools/pull/685)
* Add `requireResolversForResolveType` to resolver validation options [PR #698](https://github.com/apollographql/graphql-tools/pull/698)
* Add `inheritResolversFromInterfaces` option to `makeExecutableSchema` and `addResolveFunctionsToSchema` [PR #720](https://github.com/apollographql/graphql-tools/pull/720)

### v2.23.0

* The `SchemaDirectiveVisitor` abstraction for implementing reusable schema `@directive`s has landed. Read our [blog post](https://dev-blog.apollodata.com/reusable-graphql-schema-directives-131fb3a177d1) about this new functionality, and/or check out the [documentation](https://www.apollographql.com/docs/graphql-tools/schema-directives.html) for even more examples. [PR #640](https://github.com/apollographql/graphql-tools/pull/640)

### v2.22.0

* When concatenating errors maintain a reference to the original for use downstream [Issue #480](https://github.com/apollographql/graphql-tools/issues/480) [PR #637](https://github.com/apollographql/graphql-tools/pull/637)
* Improve generic typings for several resolver-related interfaces [PR #662](https://github.com/apollographql/graphql-tools/pull/662)
* Remove copied apollo-link code [PR #670](https://github.com/apollographql/graphql-tools/pull/670)
* Handle undefined path in `getErrorsFromParent` [PR #667](https://github.com/apollographql/graphql-tools/pull/667)

### v2.21.0

* Make iterall a runtime dependency [PR #627](https://github.com/apollographql/graphql-tools/pull/627)
* Added support for lexical parser options [PR #567](https://github.com/apollographql/graphql-tools/pull/567)
* Support `graphql@^0.13.0` [PR #567](https://github.com/apollographql/graphql-tools/pull/567)
* Don't use `Symbol` in incompatible envs [Issue #535](https://github.com/apollographql/graphql-tools/issues/535) [PR #631](https://github.com/apollographql/graphql-tools/pull/631)

### v2.20.2

* Pass through apollo-link-http errors to originalError [PR #621](https://github.com/apollographql/graphql-tools/pull/621)

### v2.20.1

* Fix `error.path` could be `undefined` for schema stitching [PR #617](https://github.com/apollographql/graphql-tools/pull/617)

### v2.20.0

* Recreate enums and scalars for more consistent behaviour of merged schemas [PR #613](https://github.com/apollographql/graphql-tools/pull/613)
* `makeExecutableSchema` and `mergeSchema` now accept an array of `IResolver` [PR #612](https://github.com/apollographql/graphql-tools/pull/612) [PR #576](https://github.com/apollographql/graphql-tools/pull/576) [PR #577](https://github.com/apollographql/graphql-tools/pull/577)
* Fix `delegateToSchema.ts` to remove duplicate new variable definitions when delegating to schemas [PR #607](https://github.com/apollographql/graphql-tools/pull/607)
* Fix duplicate subscriptions for schema stitching [PR #609](https://github.com/apollographql/graphql-tools/pull/609)

### v2.19.0

* Also recreate `astNode` property for fields, not only types, when recreating schemas. [PR #580](https://github.com/apollographql/graphql-tools/pull/580)
* Fix `delegateToSchema.js` to accept and move forward args with zero or false values [PR #586](https://github.com/apollographql/graphql-tools/pull/586)

### v2.18.0

* Fix a bug where inline fragments got filtered in merged schemas when a type implemented multiple interfaces [PR #546](https://github.com/apollographql/graphql-tools/pull/546)
* IEnumResolver value can be a `number` type [PR #568](https://github.com/apollographql/graphql-tools/pull/568)

### v2.17.0

* Include `astNode` property in schema recreation [PR #569](https://github.com/apollographql/graphql-tools/pull/569)

### v2.16.0

* Added GraphQL Subscriptions support for schema stitching and `makeRemoteExecutableSchema` [PR #563](https://github.com/apollographql/graphql-tools/pull/563)
* Make `apollo-link` a direct dependency [PR #561](https://github.com/apollographql/graphql-tools/pull/561)
* Update tests to use `graphql-js@0.12` docstring format [PR #559](https://github.com/apollographql/graphql-tools/pull/559)

### v2.15.0

* Validate query before delegation [PR #551](https://github.com/apollographql/graphql-tools/pull/551)

### v2.14.1

* Add guard against invalid schemas being constructed from AST [PR #547](https://github.com/apollographql/graphql-tools/pull/547)

### v2.14.0

Update to add support for `graphql@0.12`, and drop versions before `0.11` from the peer dependencies list. The `graphql` package has some breaking changes you might need to be aware of, but there aren't any breaking changes in `graphql-tools` itself, or common usage patterns, so we are shipping this as a minor version. We're also running tests on this package with _both_ `graphql@0.11` and `graphql@0.12` until we confirm most users have updated.

* Visit the [`graphql` releases page](https://github.com/graphql/graphql-js/releases) to keep track of for breaking changes to the underlying package.
* [PR #541](https://github.com/apollographql/graphql-tools/pull/541)

### v2.13.0

* (Experimental) Added support for custom directives on FIELD_DEFINITION that wrap resolvers with custom reusable logic. [Issue #212](https://github.com/apollographql/graphql-tools/issues/212) [PR #518](https://github.com/apollographql/graphql-tools/pull/518) and [PR #529](https://github.com/apollographql/graphql-tools/pull/529)

### v2.12.0

* Allow passing in a string `schema` to `makeRemoteExecutableSchema` [PR #521](https://github.com/apollographql/graphql-tools/pull/521)

### v2.11.0

* Merge schema now can accept resolvers in a plain object format, mergeInfo added to GraphQLResolveInfo object in merged schema resolvers [PR #511](https://github.com/apollographql/graphql-tools/pull/511)

### v2.10.0

* Added basic support for custom Enums [Issue #363](https://github.com/apollographql/graphql-tools/issues/363) [PR #507](https://github.com/apollographql/graphql-tools/pull/507) [Read the docs here](https://www.apollographql.com/docs/graphql-tools/scalars.html#enums)

### v2.9.0

* Added basic subscription support for local schemas [Issue #420](https://github.com/apollographql/graphql-tools/issues/420) [PR #463](https://github.com/apollographql/graphql-tools/pull/463)
* Fix input object default value not propagating to merged schema [Issue #497](https://github.com/apollographql/graphql-tools/issues/497) [PR #498](PR #463](https://github.com/apollographql/graphql-tools/pull/498)

### v2.8.0

* Add the option `resolverValidationOptions.allowResolversNotInSchema` to allow resolvers to be set even when they are not defined in the schemas [PR #444](https://github.com/apollographql/graphql-tools/pull/444)
* Fix schema stitching bug when aliases are used with union types and fragments [PR #482](https://github.com/apollographql/graphql-tools/pull/482)
* Remove `isTypeOf` guards from merged schemas [PR #484](https://github.com/apollographql/graphql-tools/pull/484)

### v2.7.2

* Incompatible fragments are now properly filtered [PR #470](https://github.com/apollographql/graphql-tools/pull/470)

### v2.7.1

* Made `resolvers` parameter optional for `mergeSchemas` [Issue #461](https://github.com/apollographql/graphql-tools/issues/461) [PR #462](https://github.com/apollographql/graphql-tools/pull/462)
* Make it possible to define interfaces in schema extensions [PR #464](https://github.com/apollographql/graphql-tools/pull/464)

### v2.7.0

* Upgraded versions of dependencies

### v2.6.1

* Fix one place where `apollo-link` was being used directly

### v2.6.0

* Removed direct dependency on Apollo Link, while keeping the API the same, to work around a Launchpad npm installation issue temporarily.
* Parse type, field, and argument descriptions in `typeFromAST`. This allows the
  descriptions to be part of the schema when using helpers like `mergeSchemas()`.

### v2.5.0

* Add ability to pass types in extension strings [Issue #427](https://github.com/apollographql/graphql-tools/issues/427) [PR #430](https://github.com/apollographql/graphql-tools/pull/430)

### v2.4.0

* Translate errors better in merged schema [Issue #419](https://github.com/apollographql/graphql-tools/issues/419) [PR #425](https://github.com/apollographql/graphql-tools/pull/425)

### v2.3.0

* Fix alias issues [Issue #415](https://github.com/apollographql/graphql-tools/issues/415) [PR #418](https://github.com/apollographql/graphql-tools/pull/418)
* Make `@types/graphql` a dev dependency and make it's version as flexible as `graphql` [PR #421](https://github.com/apollographql/graphql-tools/pull/421)

### v2.2.1

* Fix inability to add recursive queries [PR #413](https://github.com/apollographql/graphql-tools/pull/413)

### v2.2.0

* Change link API to pass GraphQL context as `graphqlContext` field of link
  context to avoid merging problems
* Fix alias problems in schema merging [PR #411](https://github.com/apollographql/graphql-tools/pull/411)

### v2.1.0

* Added support for passing an Apollo Link instead of a fetcher

### v2.0.0

* Add schema merging utilities [PR #382](https://github.com/apollographql/graphql-tools/pull/382)

### v1.2.3

* Update package.json to allow GraphQL.js 0.11 [Issue #394](https://github.com/apollographql/graphql-tools/issues/394) [PR #395](https://github.com/apollographql/graphql-tools/pull/395)

### v1.2.1

* Fix typings for resolver options: [Issue #372](https://github.com/apollographql/graphql-tools/issues/372) [PR #374](https://github.com/apollographql/graphql-tools/pull/374)

### v.1.2.0

* Use defaultFieldResolver from graphql-js package instead of own one [PR #373](https://github.com/apollographql/graphql-tools/pull/373)
* Remove `lodash` dependency [PR #356](https://github.com/apollographql/graphql-tools/pull/356)

### v.1.1.0

* Improve mocking of union and interface types [PR #332](https://github.com/apollographql/graphql-tools/pull/332)

### v1.0.0

* Add argument validation in `addMockFunctionsToSchema` for 'schema' property in parameter object [PR #321](https://github.com/apollographql/graphql-tools/pull/321)

### v0.11.0

* Remove dependency on `graphql-subscription` and use an interface for PubSub [PR #295](https://github.com/apollographql/graphql-tools/pull/295)
* Support schema AST as a type definition input [PR #300](https://github.com/apollographql/graphql-tools/pull/300)
* Update graphql typings to 0.9.0 [PR #298](https://github.com/apollographql/graphql-tools/pull/298)

### v0.10.1

* Update dependencies [PR #287](https://github.com/apollographql/graphql-tools/pull/287)

### v0.10.0

* Restrict version range of graphql-js peer dependency to ^0.8.0 || ^0.9.0 [PR #266](https://github.com/apollographql/graphql-tools/pull/266)

### v0.9.2

* Update graphql-js dependency to include 0.9.0 [PR #264](https://github.com/apollostack/graphql-tools/pull/264)
* Fix logErrors option so it logs errors if resolve function returns a promise [PR #262](https://github.com/apollostack/graphql-tools/pull/262)

### v0.9.1

* use function reference instead of string for concatenateTypeDefs. [PR #252](https://github.com/apollostack/graphql-tools/pull/252)

### v0.9.0

* Migrate from `typed-graphql` to `@types/graphql`. [PR #249](https://github.com/apollostack/graphql-tools/pull/249)

### v0.8.4

* `addSchemaLevelResolveFunction` resolves once per operation type and not once globally. [#220](https://github.com/apollostack/graphql-tools/pull/220)
* Replace node-uuid with uuid package [#227](https://github.com/apollostack/graphql-tools/pull/227)
* Fix issue that prevented usage of custom scalars as arguments [#224](https://github.com/apollostack/graphql-tools/pull/224)

### v0.8.3

* Remove peer dependency on `graphql-subscriptions`. [#210](https://github.com/apollostack/graphql-tools/pull/210)

### v0.8.2

* Accept an async function for the schema level resolver. ([@ephemer](https://github.com/ephemer) in [#199](https://github.com/apollostack/graphql-tools/pull/199))
* Fix for new custom scalar support introduced in `0.8.1`. ([@oricordeau](https://github.com/oricordeau) in [#203](https://github.com/apollostack/graphql-tools/pull/203))

### v0.8.1

* Support custom scalar types developed for GraphQL.js, such as [graphql-type-json](https://github.com/taion/graphql-type-json). ([@oricordeau](https://github.com/oricordeau) in [#189](https://github.com/apollostack/graphql-tools/pull/189))

### v0.8.0

* Update default resolve function to match the one from GraphQL.js ([@stubailo](https://github.com/stubailo) in [#183](https://github.com/apollostack/graphql-tools/pull/183))
* Move `typed-graphql` to `optionalDependencies` ([@stubailo](https://github.com/stubailo) in [#183](https://github.com/apollostack/graphql-tools/pull/183))
* Set new defaults for resolver validation to match GraphQL.js so that developers need to opt-in to advanced validation ([@stubailo](https://github.com/stubailo) in [#183](https://github.com/apollostack/graphql-tools/pull/183)):
  * `requireResolversForArgs = false` \* `requireResolversForNonScalar = false`

### v0.7.2

* Eliminated babel and moved to native ES5 compilation. ([@DxCx](https://github.com/DxCx) in [#147](https://github.com/apollostack/graphql-tools/pull/147))

### v0.7.1

* Fix dependency on lodash

### v0.7.0

* Various Bugfixes ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129)) - Istanbul coverage was not working well due to Istanbul bug [#549](https://github.com/gotwarlost/istanbul/issues/549) - Bluebird promise was not converted well on tests - "console.warn" got overwritten on tests

* Migrated code from Javascript to Typescript ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Deprecated addConnectorsToContext ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Removed deprecated aplloServer ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Removed testing on Node 5 ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

* Changed GraphQL typings requirement from peer to standard ([@DxCx](https://github.com/DxCx) in [#129](https://github.com/apollostack/graphql-tools/pull/129))

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

* Unpin babel-core version to solve build problem (PR [#92](https://github.com/apollographql/graphql-tools/pull/92))
* Added support for `extend` keyword to schemaGenerator (PR [#90](https://github.com/apollostack/graphql-tools/pull/90))

### v0.6.2

* Fix a bug with addSchemaLevelResolveFunction. It now runs once per tick (PR [#91](https://github.com/apollographql/graphql-tools/pull/91))

### v0.5.2

* Add addSchemaLevelResolveFunction to exports
* Remove dist folder before prepublish to make sure files deleted in source are not included in build

### v0.5.1

* Updated GraphQL dependency to 0.6.0
* Removed all tracer code, including `Tracer`, `addTracingToResolvers` and `decorateWithTracer`
