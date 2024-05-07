---
"@graphql-tools/federation": patch
"@graphql-tools/stitch": patch
---

When the gateway receives the query, now it chooses the best root field if there is the same root field in different subgraphs.
For example, if there is `node(id: ID!): Node` in all subgraphs but one implements `User` and the other implements `Post`, the gateway will choose the subgraph that implements `User` or `Post` based on the query.

If there is a unresolvable interface field, it throws.

See [this supergraph and the test query](https://github.com/ardatan/graphql-tools/tree/master/packages/federation/test/fixtures/federation-compatibility/corrupted-supergraph-node-id) to see a real-life example
