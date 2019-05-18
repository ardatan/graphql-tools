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
            {
              title: 'Monitoring and caching',
              href: 'https://www.apollographql.com/docs/engine/setup-node.html'
            },
            {
              title: 'Apollo Server',
              href: 'https://www.apollographql.com/docs/apollo-server/'
            },
            {

              title: 'GraphQL Subscriptions',
              href: 'https://www.apollographql.com/docs/graphql-subscriptions/'
            },
            {

              title: 'Production deployment',
              href: 'https://dev-blog.apollodata.com/graphql-over-rest-with-node-heroku-and-apollo-engine-fb8581f8d77f'
            }
          ]
        }
      }
    }
  ]
};
