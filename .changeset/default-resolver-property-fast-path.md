---
'@graphql-tools/executor': patch
---

Fields that rely on GraphQL's default field resolver no longer build argument maps or `GraphQLResolveInfo` when the source value is a plain property (not a method). On the leaf success path the property is read and completed directly, including non-null checks, without allocating resolve info. Method-valued properties still receive coerced arguments and resolve info and are invoked the same way as `defaultFieldResolver`. Custom field resolvers and a custom `fieldResolver` override are unchanged.
