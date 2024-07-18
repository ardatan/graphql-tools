---
'@graphql-tools/federation': patch
---

Handle errors coming from subgraphs correctly when a root field is shared by different subgraphs

- If subgraph A returns an error for `Query.foo`, and subgraph B returns the data, ignore the error and keep it for null fields.
- If both subgraphs return errors, return them as `AggregateError` then return them to the gateway result.
