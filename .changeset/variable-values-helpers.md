---
'@graphql-tools/utils': patch
---

Add `asGetArgumentValuesVariables` and `coerceGetVariableValuesResult` helpers for GraphQL 16/17 `VariableValues` compatibility when calling `getArgumentValues` / normalizing `getVariableValues` results for helpers like `shouldIncludeNode`.
