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
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
    },
    navbar: {
      // title: 'GraphQL Tools',
      logo: {
        alt: 'GraphQL Tools Logo',
        src: 'img/logo.png',
      },
      items: [
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
          href: 'https://the-guild.dev/contact',
          label: 'Contact Us',
          position: 'right',
        },
      ],
    },
  },
  scripts: ['https://the-guild.dev/static/crisp.js'],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/ardatan/graphql-tools/edit/master/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
};
