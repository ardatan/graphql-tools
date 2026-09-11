# @graphql-tools/external-fragment-loader

Resolves GraphQL fragments referenced by a package from its transitive package dependencies. The
loader scans the configured dependency packages, parses GraphQL from `.graphql` files and supported
code files, and returns only the external fragments required by the consumer package.

## Installation

```sh
npm install @graphql-tools/external-fragment-loader graphql
```

The resolver requires a package directory and one or more directories containing its dependency
packages:

```ts
const options = {
  packageDir: '/path/to/packages/my-app',
  externalPackagesDirs: ['/path/to/packages']
}
```

`packageDir` and `externalPackagesDirs` should be absolute paths. By default, the loader scans `src`
for `.ts`, `.tsx`, `.js`, `.jsx`, `.graphql`, and `.gql` files. These defaults can be changed with
the options described in [`options.ts`](./src/options.ts).

## Three API entry points

| Entry point                | Returns                                                      | Use it when                                                      |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Default export             | One merged `DocumentNode`                                    | Configuring a Codegen or GraphQL Tools custom loader (sync only) |
| `ExternalFragmentLoader`   | `Source[]` with `document`, `rawSDL`, and `location`         | Using `@graphql-tools/load` programmatically (can be async)      |
| `resolveExternalFragments` | File metadata, including `filePath` and fragment definitions | Building a file list or another custom workflow                  |

Each entry point has a synchronous variant where applicable. The async and sync variants are:

- `ExternalFragmentLoader.load()` / `loadSync()`
- `resolveExternalFragments()` / `resolveExternalFragmentsSync()`

### 1. Default loader export

The default export returns a single merged `DocumentNode`. This is the simplest option for GraphQL
Code Generator because Codegen's custom-loader path expects one `DocumentNode` or one `Source`.

For example, in a Codegen configuration:

```js
const path = require('node:path')

const packageDir = path.resolve(__dirname, '../my-app')
const externalPackagesDir = path.resolve(__dirname, '..')

module.exports = {
  schema: './schema.graphql',
  documents: {
    './src/**/*.graphql': {},
    './external-fragments.graphql': {
      loader: '@graphql-tools/external-fragment-loader',
      packageDir,
      externalPackagesDirs: [externalPackagesDir]
    }
  },
  generates: {
    './src/__generated__/types.ts': {
      plugins: ['typescript', 'typescript-operations']
    }
  }
}
```

The pointer (`./external-fragments.graphql` in this example) is only used to trigger the loader; the
resolver uses `packageDir` to identify the consumer package.

The default export is synchronous so while it works with both synchronous and asynchronous GraphQL
Tools load calls, it uses the resolver's **synchronous** path internally.

### 2. Class-based loader

Use `ExternalFragmentLoader` when calling `@graphql-tools/load` directly or when you need the
individual `Source` objects:

```ts
import { ExternalFragmentLoader } from '@graphql-tools/external-fragment-loader'

const loader = new ExternalFragmentLoader()

const sources = await loader.load('.', {
  packageDir,
  externalPackagesDirs: [externalPackagesDir]
})
```

To register the class with `@graphql-tools/load`, pass it in the `loaders` option for the pointer
that represents the external-fragment document:

```ts
import { loadDocuments } from '@graphql-tools/load'

const sources = await loadDocuments(['./external-fragments.graphql'], {
  loaders: [loader],
  packageDir,
  externalPackagesDirs: [externalPackagesDir]
})
```

The loader also exposes a **synchronous** method:

```ts
const syncSources = loader.loadSync('.', options)
```

Each returned source contains the parsed `document`, the matching `rawSDL`, and the provider file's
`location`. The class loader also deduplicates external sources when `@graphql-tools/load` invokes
it multiple times during one load operation.

### 3. Direct resolver API

Use the resolver functions when you need the external file list or fragment metadata rather than a
GraphQL Tools loader result:

```ts
import {
  resolveExternalFragments,
  resolveExternalFragmentsSync
} from '@graphql-tools/external-fragment-loader'

const files = await resolveExternalFragments(options)
const syncFiles = resolveExternalFragmentsSync(options)
```

The result has this shape:

```text
[
  {
    filePath: '/path/to/packages/shared/src/user-fields.graphql',
    packageName: '@example/shared',
    definitions: [{ name: 'UserFields', typeCondition: 'User' }]
  }
]
```

This API returns file metadata, not parsed ASTs. Passing the returned `filePath` values as Codegen
`documents` works, but Codegen will read and parse those files again. Use the default loader or the
class-based loader when you want to reuse the parsed documents.

## Async Codegen custom loaders

The default export is synchronous. Asynchronous version is much faster for large monorepos. To use
async loader, adapt the class loader's `Source[]` result into one merged `DocumentNode`:

```js
const { concatAST } = require('graphql')
const { ExternalFragmentLoader } = require('@graphql-tools/external-fragment-loader')

const loader = new ExternalFragmentLoader()

module.exports = async function externalFragmentLoader(pointer, options) {
  const sources = await loader.load(pointer, options)
  return concatAST(sources.flatMap(source => (source.document ? [source.document] : [])))
}
```

See the repository's [sync Codegen smoke test](./tests/codegen-smoke-sync/README.md) and
[async Codegen smoke test](./tests/codegen-smoke-async/README.md) for complete runnable
configurations.

## Caching

Package fragment maps, parsed sources, and `package.json` dependency metadata are cached between
resolver calls. Consumer package maps are not normally retained unless the consumer package was
previously loaded as a provider.

When running the loader in **watch mode** — for example, to run Codegen in the background while
using an IDE so that the package's generated GraphQL types are regenerated automatically whenever a
file changes — consider setting the following options:

- Set `invalidateRootPackageCache: true` to force the root package's fragment map to be rebuilt.
  This prevents stale data when a package that was previously cached as a provider is later scanned
  as the consumer.

- Set `cacheTTL` (for example, to `10000` for 10 seconds) so cached provider data eventually
  expires. This helps avoid stale data when a provider package is updated indirectly, for example by
  a `git merge`, while the watch process is still running.

## Using filters

The filters are pre-filters: they run before the expensive dependency scanning and GraphQL parsing
work. Restricting the package names and files early can be much faster than parsing every source
file in every dependency package.

### Filtering dependency packages

Use `externalPackageNameFilter` to limit which `package.json` dependencies are considered as
providers. The filter is applied to direct and transitive dependency names before their files are
scanned:

```ts
const options = {
  packageDir,
  externalPackagesDirs,
  externalPackageNameFilter: packageName =>
    packageName.startsWith('my-company-name-') || packageName === 'shared-graphql'
}
```

Packages rejected by this filter are not searched. If a required fragment is defined in a rejected
package, the resolver reports it as unresolved.

### Filtering files by content

Use `fileContentFilter` to skip source files that don't contain GraphQL. The file content is read
once and passed to the predicate, but files returning `false` are not parsed or plucked for GraphQL
documents:

```ts
const options = {
  packageDir,
  externalPackagesDirs,
  fileContentFilter: (content, filePath) => content.includes('gql`')
}

Or more generic but a little slower:

  fileContentFilter: (content, filePath) => {
    // Match the default gql/graphql tag conventions and GraphQL magic comments.
    return (
      /\b(?:gql|graphql)\s*`/.test(content) ||
      /\/\*\s*graphql\s*\*\//i.test(content)
    )
  }

```

This is especially useful when packages contain many TypeScript or JavaScript files but only a small
number of them contain GraphQL tags. A file-content filter should be broad enough not to exclude
custom GraphQL tag identifiers that are configured through `pluckConfig`.
