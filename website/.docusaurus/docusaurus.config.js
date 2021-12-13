export default {
  "title": "GraphQL Tools",
  "tagline": "A set of utilities to build your GraphQL schema in a concise, faster and powerful way",
  "url": "https://graphql-tools.com",
  "baseUrl": "/",
  "favicon": "img/favicon.ico",
  "organizationName": "ardatan",
  "projectName": "graphql-tools",
  "themeConfig": {
    "colorMode": {
      "defaultMode": "dark",
      "disableSwitch": false,
      "respectPrefersColorScheme": false,
      "switchConfig": {
        "darkIcon": "🌜",
        "darkIconStyle": {},
        "lightIcon": "🌞",
        "lightIconStyle": {}
      }
    },
    "navbar": {
      "logo": {
        "alt": "GraphQL Tools Logo",
        "src": "img/logo.png"
      },
      "items": [
        {
          "to": "docs/introduction",
          "activeBasePath": "docs",
          "label": "API & Documentation",
          "position": "right"
        },
        {
          "href": "https://github.com/ardatan/graphql-tools",
          "label": "GitHub",
          "position": "right"
        },
        {
          "href": "https://the-guild.dev/contact",
          "label": "Contact Us",
          "position": "right"
        }
      ],
      "hideOnScroll": false
    },
    "algolia": {
      "appId": "ANRJKXZTRW",
      "apiKey": "811d453fc7f80306044dd5cc4b87e064",
      "indexName": "theguild",
      "algoliaOptions": {},
      "contextualSearch": false,
      "searchParameters": {}
    },
    "footer": {
      "style": "dark",
      "links": [
        {
          "title": "Community",
          "items": [
            {
              "label": "Discord",
              "href": "http://bit.ly/guild-chat"
            },
            {
              "label": "Stack Overflow",
              "href": "https://stackoverflow.com/questions/tagged/graphql-tools"
            }
          ]
        },
        {
          "title": "Social",
          "items": [
            {
              "label": "GitHub",
              "href": "https://github.com/Urigo/graphql-tools/"
            },
            {
              "label": "Twitter",
              "href": "https://twitter.com/TheGuildDev"
            }
          ]
        }
      ],
      "copyright": "Copyright © 2021 The Guild, Inc. Built with Docusaurus."
    },
    "docs": {
      "versionPersistence": "localStorage"
    },
    "metadatas": [],
    "prism": {
      "additionalLanguages": []
    },
    "hideableSidebar": false
  },
  "scripts": [
    {
      "src": "https://the-guild.dev/static/banner.js",
      "async": true,
      "defer": true
    }
  ],
  "presets": [
    [
      "@docusaurus/preset-classic",
      {
        "docs": {
          "sidebarPath": "/data/tc/projects/theguild/graphql-tools/website/sidebars.js",
          "editUrl": "https://github.com/ardatan/graphql-tools/edit/master/website/"
        },
        "theme": {
          "customCss": "/data/tc/projects/theguild/graphql-tools/website/src/css/custom.css"
        }
      }
    ]
  ],
  "onBrokenLinks": "warn",
  "onBrokenMarkdownLinks": "warn",
  "baseUrlIssueBanner": true,
  "i18n": {
    "defaultLocale": "en",
    "locales": [
      "en"
    ],
    "localeConfigs": {}
  },
  "onDuplicateRoutes": "warn",
  "customFields": {},
  "plugins": [],
  "themes": [],
  "titleDelimiter": "|",
  "noIndex": false
};