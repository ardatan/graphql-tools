module.exports = {
  "someSidebar": [
    "introduction",
    {
      "Guides": [
        "generate-schema",
        "resolvers",
        "resolvers-composition",
        "scalars",
        "mocking",
        "connectors",
        "schema-directives",
        "schema-delegation",
        "remote-schemas",
        "schema-wrapping",
        "schema-merging",
        {
          "Schema stitching": [
            "stitch-combining-schemas",
            "stitch-type-merging",
            "stitch-directives-sdl",
            "stitch-schema-extensions",
            "stitch-api"
          ]
        },
        "server-setup",
        "schema-loading",
        "documents-loading",
        "graphql-tag-pluck",
        "relay-operation-optimizer",
        {
          "Migration": [
            "migration-from-tools",
            "migration-from-toolkit",
            "migration-from-merge-graphql-schemas",
            "migration-from-import"
          ]
        }
      ]
    },
    {
      "API Reference": require('./api-sidebar.json')
    }
  ]
}
