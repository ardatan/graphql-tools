---
'@graphql-tools/apollo-engine-loader': patch
---

`ApolloEngineLoader` now sends `operationName: "GetSchemaByTag"` in the GraphQL request body.

The query was already named `GetSchemaByTag`, but the POST body only had `query` and `variables`. Servers and Apollo Server plugins that require an operation name on the request (and read it from the JSON body, not the document) rejected this introspection call. The GitHub loader already sends `operationName` the same way.
