module.exports = {
  __experimentalThemes: [
    {
      resolve: 'gatsby-theme-apollo-docs',
      options: {
        root: __dirname,
        subtitle: 'GraphQL Tools',
        description: 'A guide to using GraphQL Tools',
        contentDir: 'docs/source',
        basePath: '/docs/graphql-tools',
        githubRepo: 'apollographql/graphql-tools',
        sidebarCategories: {
          null: [
            'index',
            'generate-schema',
            'resolvers',
            'scalars',
            'mocking',
            'connectors',
            'schema-directives',
            'schema-delegation',
            'remote-schemas',
            'schema-transforms',
            'schema-stitching'
          ],
          Related: [
            '[Monitoring and caching](https://www.apollographql.com/docs/engine/setup-node.html)',
            '[Apollo Server](https://www.apollographql.com/docs/apollo-server/)',
            '[GraphQL Subscriptions](https://www.apollographql.com/docs/graphql-subscriptions/)',
            '[Production deployment](https://dev-blog.apollodata.com/graphql-over-rest-with-node-heroku-and-apollo-engine-fb8581f8d77f)'
          ]
        }
      }
    }
  ]
};
