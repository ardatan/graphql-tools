---
'@graphql-tools/executor': patch
---

perf(executor): skip argument coercion and `GraphQLResolveInfo` allocation when a field uses the default field resolver and the source value is a plain property (not a method). Leaf success paths complete without building resolve info; method-valued properties and custom resolvers keep the existing path.
