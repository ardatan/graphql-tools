/* eslint-disable import/no-commonjs */
/* eslint-disable import/unambiguous */
module.exports = {
  title: 'GraphQL Tools',
  tagline: 'A set of utilities to build your GraphQL schema in a concise, faster and powerful way',
  url: 'https://graphql-tools.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'ardatan', // Usually your GitHub org/user name.
  projectName: 'graphql-tools', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'GraphQL Tools',
      logo: {
        alt: 'GraphQL Tools Logo',
        src: 'img/logo.svg',
      },
      links: [
        {
          to: 'docs/introduction',
          activeBasePath: 'docs',
          label: 'API & Documentation',
          position: 'right',
        },
        {
          href: 'https://github.com/ardatan/graphql-tools',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://the-guild.dev/connected-build?utm_source=github&utm_medium=release-note&utm_campaign=tools#section-contact',
          label: 'Contact Us',
          position: 'right'
        },
      ],
    },
    algolia: {
      // appId: 'graphql-tools',
      apiKey: 'api-key',
      indexName: 'graphql-tools',
      algoliaOptions: {}, // Optional, if provided by Algolia
    },
    footer: {
      style: 'dark',
      links: [
/* {
          title: 'Docs',
          items: [
            {
              label: 'Style Guide',
              to: 'docs/doc1'
            },
            {
              label: 'Second Doc',
              to: 'docs/doc2'
            }
          ]
        }, */
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'http://bit.ly/guild-chat'
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/graphql-mesh'
            }
          ]
        },
        {
          title: 'Social',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Urigo/graphql-mesh/'
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/TheGuildDev'
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} The Guild, Inc. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/facebook/docusaurus/edit/master/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
