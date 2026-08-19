---
'@graphql-tools/import': minor
---

`# import` paths may use a `require:` prefix, resolved with Node's `require.resolve` from the importing file. Example: `# import Post from "require:blog-graphql-types/schema.graphql"` or `# import A from "require:./a.graphql"`.
