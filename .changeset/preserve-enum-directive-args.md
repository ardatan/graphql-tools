---
'@graphql-tools/utils': patch
---

`printSchemaWithDirectives` no longer turns unquoted directive argument literals into strings.

In GraphQL SDL, an unquoted identifier in value position is an `EnumValue` AST node. A quoted value is a `StringValue`. Those are different kinds even when the argument type is a custom scalar rather than an `enum` type. `parseLiteral` on that scalar receives the original kind, so a custom scalar can treat `argument_value` and `"argument_value"` as different inputs.

The printer was reconstructing directive arguments from JS values. `valueFromASTUntyped` maps both kinds to the same string, and `astFromValue` then emits a `StringValue`. The printed SDL became `@directive(arg: "argument_value")` even though the schema AST still had `@directive(arg: argument_value)`.

That is a round-trip / fidelity bug: loaders, schema diffs, snapshots, and subgraph publishes see different SDL, and a scalar that distinguishes the two kinds changes meaning. Default scalars coerce both to the same JS string, so many runtime paths do not notice.

When the original AST is still the source of truth, `printSchemaWithDirectives` now keeps those directive argument nodes, including nested list and input-object values. If directive values are supplied only through extensions (code-first), JS strings are still printed as strings because the original kind is not available.

Fixes #8557
