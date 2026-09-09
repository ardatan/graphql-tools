/**
 * Generates the API reference of every public package into
 * website/content/docs/api, in the content-only layout that
 * the-guild-org/website renders: one markdown page per exported symbol with a
 * frontmatter `title`, a `meta.json` per folder for the sidebar, and links
 * root-relative to the docs site (`/docs/api/...`). The output is committed;
 * .github/workflows/website-content.yaml regenerates it on master.
 */
import fs, { promises as fsPromises, readFileSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import globby from 'globby';
import { Application, TSConfigReader } from 'typedoc';
import workspacePackageJson from '../package.json' with { type: 'json' };

const MONOREPO = workspacePackageJson.name.replace('-monorepo', '');
const CWD = process.cwd();
// Where to generate the API docs
const OUTPUT_PATH = path.join(CWD, 'website/content/docs/api');
// URL of OUTPUT_PATH on the docs site, relative to the product root.
const URL_BASE = '/docs/api';

async function buildApiDocs(): Promise<void> {
  // An array of tuples where the first element is the package's name and
  // the second element is the relative path to the package's entry point
  const packageJsonFiles = globby.sync(
    workspacePackageJson.workspaces.map(f => `${f}/package.json`),
  );
  const modules: Array<[string, string]> = [];

  for (const packageJsonPath of packageJsonFiles) {
    const packageJsonContent = JSON.parse(readFileSync(path.join(CWD, packageJsonPath), 'utf-8'));
    // Do not include private and large npm package that contains rest
    if (
      !packageJsonContent.private &&
      packageJsonContent.name !== MONOREPO &&
      // Skipping the fork for now
      !packageJsonContent.name.endsWith('/graphql') &&
      !packageJsonContent.name.endsWith('/container')
    ) {
      modules.push([
        packageJsonContent.name,
        packageJsonPath.replace('./', '').replace('package.json', 'src/index.ts'),
      ]);
    }
  }

  // Entry file paths are like 'packages/utils/src/index.ts'; TypeDoc strips the
  // shared 'packages/' prefix, so that package's pages land under 'utils/src/'.
  // Map every output directory that is a package (or a group of packages, like
  // 'loaders') to the label the sidebar shows for it.
  const dirLabels = new Map<string, string>();
  for (const [name, filePath] of modules) {
    const moduleDir = path.posix.dirname(filePath).replace(/^packages\//, ''); // utils/src
    const packageDir = path.posix.dirname(moduleDir); // utils, loaders/url
    dirLabels.set(moduleDir, name);
    dirLabels.set(packageDir, name);
    // Multiple packages share a parent directory (packages/executors/*,
    // packages/loaders/*): label the parent by its capitalised name.
    const groupDir = path.posix.dirname(packageDir);
    if (groupDir !== '.') {
      dirLabels.set(groupDir, groupDir.charAt(0).toUpperCase() + groupDir.slice(1));
    }
  }

  // Delete existing docs directory
  await fsPromises.rm(OUTPUT_PATH, { recursive: true }).catch(() => null);
  console.log('🧹 ', styleText('green', 'Deleted existing docs directory'), OUTPUT_PATH);
  // Initialize TypeDoc
  const typeDoc = await Application.bootstrapWithPlugins(
    {
      excludePrivate: true,
      excludeProtected: true,
      readme: 'none',
      hideGenerator: true,
      githubPages: false,
      gitRevision: 'master',
      tsconfig: path.join(CWD, 'tsconfig.json'),
      entryPoints: modules.map(([_name, filePath]) => filePath),
      plugin: ['typedoc-plugin-markdown'],
      logLevel: 'Verbose',
      // Skip TypeScript type-check errors so third-party declaration issues don't
      // prevent documentation from being generated.
      skipErrorChecking: true,
      // Tell typedoc-plugin-markdown where to write the markdown output.
      out: OUTPUT_PATH,
      // Remove breadcrumb navigation and the page header so each file starts
      // with the main heading, which becomes the front-matter title.
      hideBreadcrumbs: true,
      hidePageHeader: true,
    },
    [new TSConfigReader()],
  );

  // Generate the API docs (typedoc-plugin-markdown registers a "markdown" output
  // type; generateOutputs() uses that instead of the default HTML renderer).
  const project = await typeDoc.convert();
  await typeDoc.generateOutputs(project!);

  // --- Post-processing into the website's content layout -------------------

  const KIND_PREFIX = /^(Class|Interface|Enumeration|Function|Type Alias|Variable|Namespace): /;

  /** The page's symbol name and kind, from typedoc-plugin-markdown's H1. */
  function parseHeading(heading: string): { kind?: string; name: string } {
    const cleaned = heading
      .replace(/^# /, '')
      // Remove strikethrough markers (used for deprecated items)
      .replace(/^~~(.+)~~$/, '$1');
    const kind = KIND_PREFIX.exec(cleaned)?.[1];
    const name = cleaned
      .replace(KIND_PREFIX, '')
      // Strip generic type parameters (e.g. MyClass<T> or MyClass\<T\> in markdown)
      .replace(/\\?<[^>]*\\?>/g, '')
      // Remove trailing call-signature parentheses, e.g. "myFunc()"
      .replace(/\(\)$/, '')
      // Remove backslash escapes used in markdown (e.g. \_ → _)
      .replace(/\\([_<>*])/g, '$1')
      .trim();
    return { kind, name };
  }

  /** Output path of a generated file, relative to OUTPUT_PATH, as the site serves it. */
  function siteRelativePath(relativePath: string): string {
    return relativePath.toLowerCase().replace(/(^|\/)readme\.md$/, '$1index.md');
  }

  /** Site URL (product-relative) of a generated file, given its original relative path. */
  function urlOf(relativePath: string): string {
    const slug = siteRelativePath(relativePath)
      .replace(/\.md$/, '')
      .replace(/(^|\/)index$/, '');
    return slug ? `${URL_BASE}/${slug}` : URL_BASE;
  }

  /** Turns relative links between generated files into root-relative site URLs. */
  function rewriteLinks(markdown: string, fromRelativePath: string): string {
    const fromDir = path.posix.dirname(fromRelativePath);
    return markdown.replace(
      /\]\(([^)\s]+?\.md)(#[^)\s]*)?\)/g,
      (match, target: string, anchor: string | undefined) => {
        if (/^[a-z]+:/i.test(target)) return match;
        const resolved = path.posix.normalize(path.posix.join(fromDir, target));
        if (resolved.startsWith('..')) return match;
        return `](${urlOf(resolved)}${anchor ?? ''})`;
      },
    );
  }

  const generatedFiles = globby.sync('**/*.md', { cwd: OUTPUT_PATH });

  interface Page {
    body: string;
    kind?: string;
    name: string;
    original: string;
    output: string;
  }
  const pages: Page[] = [];
  for (const relativePath of generatedFiles) {
    const contents = await fsPromises.readFile(path.join(OUTPUT_PATH, relativePath), 'utf-8');
    // With hidePageHeader+hideBreadcrumbs every file starts with "# Heading".
    const headingMatch = /^# .+/.exec(contents);
    if (!headingMatch) {
      throw new Error(`Generated page without a heading: ${relativePath}`);
    }
    const { kind, name } = parseHeading(headingMatch[0]);
    let body = rewriteLinks(contents.slice(headingMatch[0].length), relativePath).trim();
    if (relativePath === 'README.md') {
      // The root page lists the modules by entry path ("utils/src"); show package names.
      body = body.replace(/^- \[([^\]]+)\]\(/gm, (match, moduleDir: string) => {
        const label = dirLabels.get(moduleDir);
        return label ? `- [${label}](` : match;
      });
    }
    pages.push({
      body,
      kind,
      name,
      original: relativePath,
      output: siteRelativePath(relativePath),
    });
    // Removed before the lowercase copy is written: on case-insensitive file
    // systems the two names are the same file.
    await fsPromises.unlink(path.join(OUTPUT_PATH, relativePath));
  }

  const packageOf = (page: Page) => {
    const parts = page.output.split('/');
    // '<pkg>/src/...' or '<group>/<pkg>/src/...'
    const srcIndex = parts.indexOf('src');
    return srcIndex === -1 ? undefined : dirLabels.get(parts.slice(0, srcIndex + 1).join('/'));
  };

  // The site fails its build on two pages with the same <title>; symbols that
  // exist in several packages (or as several kinds) get a qualified title. The
  // sidebar still shows the plain name.
  const titleOf = (page: Page) => {
    if (page.output === 'index.md') return 'API Reference';
    if (page.output.endsWith('/index.md')) return packageOf(page) ?? page.name;
    return page.name;
  };
  const titleCounts = new Map<string, number>();
  for (const page of pages)
    titleCounts.set(titleOf(page), (titleCounts.get(titleOf(page)) ?? 0) + 1);

  for (const page of pages) {
    let title = titleOf(page);
    let sidebarTitle: string | undefined;
    let description: string;
    if (page.output === 'index.md') {
      description = `The API reference of every GraphQL Tools package, generated from the TypeScript sources.`;
    } else if (page.output.endsWith('/index.md')) {
      description = `Everything exported by the ${title} package: functions, classes, interfaces, types and variables.`;
    } else {
      const packageName = packageOf(page) ?? MONOREPO;
      const kind = page.kind?.toLowerCase() ?? 'export';
      description = `The ${page.name} ${kind} exported by ${packageName}.`;
      if ((titleCounts.get(title) ?? 0) > 1) {
        sidebarTitle = page.name;
        title = `${page.name} (${kind} in ${packageName})`;
      }
    }
    const frontmatter = [
      '---',
      `title: ${JSON.stringify(title)}`,
      ...(sidebarTitle ? [`sidebarTitle: ${JSON.stringify(sidebarTitle)}`] : []),
      `description: ${JSON.stringify(description)}`,
      '---',
    ].join('\n');
    const outputPath = path.join(OUTPUT_PATH, page.output);
    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
    await fsPromises.writeFile(outputPath, `${frontmatter}\n\n${page.body}\n`);
  }
  // Directories emptied by the lowercase renames.
  for (const relativePath of generatedFiles) {
    let dir = path.dirname(relativePath);
    while (dir !== '.') {
      const absolute = path.join(OUTPUT_PATH, dir);
      if (fs.existsSync(absolute) && fs.readdirSync(absolute).length === 0) {
        await fsPromises.rmdir(absolute);
      }
      dir = path.dirname(dir);
    }
  }

  // Sidebar: one meta.json per folder, listing its children in order. Folders
  // with an index page (a package's module page, the reference root) become
  // links themselves, so the index is not listed as a separate entry.
  function humanize(name: string): string {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  const sidebarLabel = (page: Page) => {
    const title = titleOf(page);
    return (titleCounts.get(title) ?? 0) > 1 ? page.name : title;
  };
  const labelByOutput = new Map(pages.map(page => [page.output, sidebarLabel(page)]));

  async function writeMeta(relativeDir: string): Promise<void> {
    const absolute = path.join(OUTPUT_PATH, relativeDir);
    const entries = await fsPromises.readdir(absolute, { withFileTypes: true });
    const children: Array<{ key: string; label: string }> = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childDir = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
        await writeMeta(childDir);
        children.push({ key: entry.name, label: dirLabels.get(childDir) ?? humanize(entry.name) });
      } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
        const key = entry.name.slice(0, -3);
        const output = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
        children.push({ key, label: labelByOutput.get(output) ?? key });
      }
    }
    children.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    const title = relativeDir
      ? (dirLabels.get(relativeDir) ?? humanize(path.basename(relativeDir)))
      : 'API Reference';
    await fsPromises.writeFile(
      path.join(absolute, 'meta.json'),
      `${JSON.stringify({ title, pages: children.map(child => child.key) }, null, 2)}\n`,
    );
  }
  await writeMeta('');

  console.log('✅ ', styleText('green', `${pages.length} API pages written to ${OUTPUT_PATH}`));
}

buildApiDocs().catch(e => {
  console.error(e);
  process.exit(1);
});
