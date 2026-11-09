---
'@graphql-tools/executor': patch
---

Fields that rely on GraphQL's default field resolver no longer invoke `defaultFieldResolver` when the source value is a plain property (not a method). Argument coercion still runs before the property read when the field declares arguments, so missing or invalid required arguments surface the same way as before. Method-valued properties still receive coerced arguments and resolve info. Completion continues through the normal `completeValue` path so Error-valued properties, async scalar serialize, and non-leaf fields keep existing field-error behavior. Custom field resolvers and a custom `fieldResolver` override are unchanged.
