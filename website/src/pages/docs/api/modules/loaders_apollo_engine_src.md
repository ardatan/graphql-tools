# @graphql-tools/apollo-engine-loader

### Classes

- [ApolloEngineLoader](/docs/api/classes/loaders_apollo_engine_src.ApolloEngineLoader)

### Interfaces

- [ApolloEngineOptions](/docs/api/interfaces/loaders_apollo_engine_src.ApolloEngineOptions)

### Variables

- [SCHEMA_QUERY](loaders_apollo_engine_src#schema_query)

## Variables

### SCHEMA_QUERY

• `Const` **SCHEMA_QUERY**:
`"\n  query GetSchemaByTag($tag: String!, $id: ID!) {\n    service(id: $id) {\n      ... on Service {\n        __typename\n        schema(tag: $tag) {\n          document\n        }\n      }\n    }\n  }\n"`

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L103)
