---
id: schema-stitching
title: Schema Stitching
sidebar_label: Schema Stitching
---

Schema stitching is the process of creating a single GraphQL gateway schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that we can query for all of our data in a single request from one schema. As that schema grows though, it may become cumbersome to manage it all in one codebase. It may become preferable to split the schema into seperate modules or microservices that can be developed and deployed independently. We may also want to integrate our own schema with third-party schemas.

In these cases, `stitchSchemas` is used to combine multiple GraphQL schemas into one unified gateway schema that knows how to delegate parts of a query to the relevant underlying subschemas. These subschemas may be local GraphQL instances or APIs running on a remote server. They can even be third-party services, allowing us to create mashups with external data.

[You can start learning about it in this section](/docs/stitch-combining-schemas)
