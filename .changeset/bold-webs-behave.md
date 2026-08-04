---
'@graphql-tools/executor-urql-exchange': minor
'@graphql-tools/executor-apollo-link': minor
'@graphql-tools/git-loader': minor
'@graphql-tools/executor': minor
'@graphql-tools/optimize': minor
'@graphql-tools/schema': minor
'@graphql-tools/utils': minor
---

Add support for graphql-js v17

Core fixes (graphql-js v17 compatibility)

@graphql-tools/executor: buildResolveInfo implements v17's new required getAbortSignal()/getAsyncHelpers() on GraphQLResolveInfo, and wraps info.variableValues in v17's structured {coerced, sources} shape (previously leaked a flat map); variable coercion adapted to v17's coerceInputValue/validateInputValue split, including default-value coercion for both variables and arguments.
@graphql-tools/utils: getArgumentValues migrated to coerceInputLiteral (v17 stopped rejecting AST literals of the wrong kind via valueFromAST); new graphqlJSCompat.ts module centralizes version-detection (getOptionalGraphQLJSExport) and the flat-map ↔ {coerced, sources} conversion (toGraphQLJSVariableValues) shared across the package; fixed a bug where non-null arguments with schema-defined (SDL) defaults, referenced via an unprovided variable, incorrectly threw instead of applying the default.
@graphql-tools/schema: addResolversToSchema updates coerceOutputValue/coerceInputValue (what v17 actually calls at runtime) whenever a scalar resolver overrides serialize/parseValue, including a fix for a stale-closure bug when rebuilding scalar types.
Compatibility widening

graphql peer range widened to include ^17.0.0 for @graphql-tools/executor-apollo-link and @graphql-tools/executor-urql-exchange.
Two new patch-package patches fixing incorrect/outdated .d.ts files in @types/relay-compiler and subscriptions-transport-ws that referenced graphql-js exports removed/renamed in v17.
Tests

Executor, schema, loader, and optimize test suites made version-aware (versionInfo.major >= 17 branches) where v17 output differs from v15/v16.
New getArgumentValues.spec.ts covering the coerceInputLiteral-nested-variable and SDL-default-value fixes.
Tooling

Root graphql devDependency/override pinned to 17.0.2.
CI (tests.yml, uncommitted): merged the temporary v17-only test job into the main matrix (now tests full suite against v15/v16/v17, excluding Node 18 × v17 since v17 requires Node ≥22), removed the old temp job, and re-labeled the "Full Check" job to reflect it now runs on v17.
Changeset: minor bump for 7 affected packages.
