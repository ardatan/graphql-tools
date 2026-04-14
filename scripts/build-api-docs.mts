import fs, { promises as fsPromises, readFileSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import globby from 'globby';
import { Application, TSConfigReader } from 'typedoc';
import workspacePackageJson from '../package.json' with { type: 'json' };

const MONOREPO = workspacePackageJson.name.replace('-monorepo', '');
const CWD = process.cwd();
// Where to generate the API docs
const OUTPUT_PATH = path.join(CWD, 'website/src/content/api');

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
      !packageJsonPath.includes('./website/') &&
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

  // Build a map from top-level output directory name to the package display name.
  // Entry file paths are like 'packages/utils/src/index.ts'; TypeDoc strips the
  // shared 'packages/' prefix, so the output top-level dir becomes 'utils'.
  const dirToPackageName = new Map<string, string>();
  for (const [name, filePath] of modules) {
    // filePath = 'packages/<pkg>/src/index.ts' or
    //            'packages/<group>/<subpkg>/src/index.ts'
    const dirName = filePath.split('/')[1];
    if (dirName) {
      if (dirToPackageName.has(dirName)) {
        // Multiple packages share the same top-level directory
        // (e.g. packages/executors/* or packages/loaders/*).
        // Fall back to the capitalised directory name as the display label.
        const capitalized = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        dirToPackageName.set(dirName, capitalized);
      } else {
        dirToPackageName.set(dirName, name);
      }
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
      // with the main heading, which patchMarkdownFile uses for the front-matter title.
      hideBreadcrumbs: true,
      hidePageHeader: true,
    },
    [new TSConfigReader()],
  );

  // Generate the API docs (typedoc-plugin-markdown registers a "markdown" output
  // type; generateOutputs() uses that instead of the default HTML renderer).
  const project = await typeDoc.convert();
  await typeDoc.generateOutputs(project!);

  async function patchMarkdownFile(filePath: string): Promise<void> {
    const contents = await fsPromises.readFile(filePath, 'utf-8');
    const contentsTrimmed = contents
      // Add YAML front-matter with a title derived from the first H1 heading.
      .replace(/^# .+/m, match => {
        const title = match
          .replace('# ', '')
          // Strip type prefixes added by typedoc-plugin-markdown (both old and new formats)
          .replace(/^(Class|Interface|Enumeration|Function|Type alias|Variable|Namespace): /, '')
          .replace(/(\\)?<.+/, '')
          // Remove trailing call-signature parentheses, e.g. "myFunc()"
          .replace(/\(\)$/, '');
        return ['---', `title: '${title}'`, '---', '', match].join('\n');
      })
      // Remove .md extensions from links so the router handles them correctly.
      .replace(/\.md/g, '');

    await fsPromises.writeFile(filePath, contentsTrimmed);
    const relativePath = path.relative(CWD, filePath);
    const newFileName = relativePath.toLowerCase();
    await fsPromises.rename(filePath, newFileName);
    console.log('✅ ', styleText('green', newFileName));
  }

  async function visitMarkdownFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.warn(`${filePath} doesn't exist! Ignoring.`);
      return;
    }
    const lsStat = await fsPromises.lstat(filePath);
    if (lsStat.isFile()) {
      await patchMarkdownFile(filePath);
      return;
    }
    const filesInDirectory = await fsPromises.readdir(filePath);
    await Promise.all(
      filesInDirectory.map(fileName => visitMarkdownFile(path.join(filePath, fileName))),
    );

    await fsPromises.writeFile(
      path.join(filePath, '_meta.ts'),
      'export default ' +
        JSON.stringify(
          Object.fromEntries(
            filesInDirectory
              .map(fileName => {
                const bare = fileName.replace(/\.md$/, '');
                const key = bare.toLowerCase();
                const value = bare.replace(/^.*\./, '');
                return [key, value];
              })
              .sort((a, b) => a[1].localeCompare(b[1])),
          ),
          null,
          2,
        ),
    );
  }

  // Discover the top-level package directories that TypeDoc created and patch
  // their markdown files, then generate _meta.ts files for each level.
  const topLevelEntries = await fsPromises.readdir(OUTPUT_PATH);
  const topLevelDirs = (
    await Promise.all(
      topLevelEntries.map(async name => {
        const fullPath = path.join(OUTPUT_PATH, name);
        const stat = await fsPromises.lstat(fullPath);
        return stat.isDirectory() ? name : null;
      }),
    )
  ).filter((name): name is string => name !== null);

  await Promise.all(
    topLevelDirs.map(async dirName => {
      await visitMarkdownFile(path.join(OUTPUT_PATH, dirName));
    }),
  );

  // Write the root _meta.ts listing each package directory with its npm name.
  await fsPromises.writeFile(
    path.join(OUTPUT_PATH, '_meta.ts'),
    'export default ' +
      JSON.stringify(
        Object.fromEntries(
          topLevelDirs
            .map(dirName => [dirName, dirToPackageName.get(dirName) ?? dirName])
            .sort((a, b) => a[1].localeCompare(b[1])),
        ),
        null,
        2,
      ),
  );
}

buildApiDocs().catch(e => {
  console.error(e);
  process.exit(1);
});
