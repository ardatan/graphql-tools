# GraphQL Tools docs

The documentation at [the-guild.dev/graphql/tools](https://the-guild.dev/graphql/tools) is authored
here and rendered by [the-guild-org/website](https://github.com/the-guild-org/website), which
fetches this folder at build time. Nothing in this folder is built or deployed on its own.

## Layout

| Path                  | What it is                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `content/docs/`       | The hand-written documentation. Page order and folder titles come from each folder's `meta.json`.                              |
| `content/docs/api/`   | The API reference, generated from the packages by `npm run build:api-docs` (do not edit by hand).                              |
| `content/changelogs/` | One page per package changelog, generated from `packages/**/CHANGELOG.md` by `npm run build:changelogs` (do not edit by hand). |
| `assets/`             | Images referenced from pages as `/assets/...`.                                                                                 |

The generated folders are committed so that the website never has to build this monorepo. The
`website-content` workflow regenerates them on every push to `master` that touches `packages/`.

## Writing pages

- Frontmatter: `title` (required) and `description`. The site renders the title as the page heading,
  so pages do not start with an `# H1`. Use `sidebarTitle` when the sidebar should show a shorter
  label.
- Ordering: each folder's `meta.json` lists `pages` in display order; a folder's `title` is its
  sidebar label. Pages not listed are built but hidden from the sidebar.
- Components available without importing: `Callout`, `Tabs` / `Tabs.Tab`, `Cards`, `FileTree`. Name
  code blocks with ` ```ts title="example.ts" `, and use ` ```sh npm2yarn ` for install commands.
- Links between pages are root-relative to this product: `/docs/...`, `/docs/api/...`,
  `/changelogs/...`.

## Previewing changes

Every same-repository pull request that touches this folder gets a preview at
`https://tools-pr-<number>.guild-dev-website.pages.dev/graphql/tools` (linked in a PR comment within
about ten minutes). Merges to `master` redeploy the live docs automatically.
