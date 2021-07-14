---
'@graphql-tools/batch-delegate': major
'@graphql-tools/batch-execute': major
'@graphql-tools/delegate': major
'@graphql-tools/links': major
'@graphql-tools/url-loader': major
'@graphql-tools/stitch': major
'@graphql-tools/utils': major
'@graphql-tools/wrap': major
---

refactor: ExecutionParams type replaced by Request type

rootValue property is now a part of the Request type.

When delegating with delegateToSchema, rootValue can be set multiple ways:

- when using a custom executor, the custom executor can utilize a rootValue in whichever custom way it specifies.
- when using the default executor (execute/subscribe from graphql-js):
  -- rootValue can be passed to delegateToSchema via a named option
  -- rootValue can be included within a subschemaConfig
  -- otherwise, rootValue is inferred from the originating schema

When using wrapSchema/stitchSchemas, a subschemaConfig can specify the createProxyingResolver function which can pass whatever rootValue it wants to delegateToSchema as above.
