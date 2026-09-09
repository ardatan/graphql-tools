---
title: "SCHEMA_QUERY"
description: "The SCHEMA_QUERY variable exported by @graphql-tools/apollo-engine-loader."
---

> `const` **SCHEMA\_QUERY**: "\n  query GetSchemaByTag($tag: String!, $id: ID!) \{\n    service(id: $id) \{\n      ... on Service \{\n        \_\_typename\n        schema(tag: $tag) \{\n          document\n        \}\n      \}\n    \}\n  \}\n"

Defined in: [packages/loaders/apollo-engine/src/index.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L103)

**`Internal`**
