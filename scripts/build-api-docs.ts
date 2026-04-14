import fs, { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import globby from 'globby';
import { Application, TSConfigReader } from 'typedoc';
import workspacePackageJson from '../package.json';

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
    const packageJsonContent = require(path.join(CWD, packageJsonPath));
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
      // typedoc-plugin-markdown v4: output directory and router
      out: OUTPUT_PATH,
      router: 'kind',
    },
    [new TSConfigReader()],
  );

  // Generate the API docs (typedoc-plugin-markdown v4 uses generateOutputs)
  const project = await typeDoc.convert();
  await typeDoc.generateOutputs(project!);

  async function patchMarkdownFile(filePath: string): Promise<void> {
    const contents = await fsPromises.readFile(filePath, 'utf-8');
    const contentsTrimmed = contents
      // Fix title
      .replace(/^# .+/g, match => {
        const title = match
          .replace('# ', '')
          .replace(/(Class|Interface|Enumeration): /, '')
          .replace(/(\\)?<.+/, '');
        return ['---', `title: '${title}'`, '---', '', match].join('\n');
      })
      // Fix links
      .replace(/\.md/g, '')
      .replace(
        /\[([^\]]+)]\((\.\.\/(classes|interfaces|enums|functions|types|variables)\/([^)]+))\)/g,
        '[$1](/docs/api/$3/$4)',
      );

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
                fileName = fileName.replace(/\.md$/, '');
                const key = fileName.toLowerCase();
                const value = fileName.replace(/^.*\./, '');

                if (filePath.endsWith('/modules')) {
                  return [key, `${value.replace('_src', '').replace(/_/g, '-')}`];
                }

                return [key, value];
              })
              .sort((a, b) => a[1].localeCompare(b[1])),
          ),
          null,
          2,
        ),
    );
  }

  // Patch the generated markdown
  // See https://github.com/tgreyuk/typedoc-plugin-markdown/pull/128
  await Promise.all(
    ['classes', 'enums', 'interfaces', 'modules', 'functions', 'types', 'variables'].map(
      async dirName => {
        const subDirName = path.join(OUTPUT_PATH, dirName);
        await visitMarkdownFile(subDirName);
      },
    ),
  );

  // Dynamically build the root _meta.ts based on which directories were generated
  const allDirMeta: Record<string, string> = {
    modules: 'Packages',
    classes: 'Classes',
    enums: 'Enums',
    interfaces: 'Interfaces',
    functions: 'Functions',
    types: 'Types',
    variables: 'Variables',
  };
  const existingDirs = Object.entries(allDirMeta).filter(([dirName]) =>
    fs.existsSync(path.join(OUTPUT_PATH, dirName)),
  );
  await fsPromises.writeFile(
    path.join(OUTPUT_PATH, '_meta.ts'),
    'export default ' + JSON.stringify(Object.fromEntries(existingDirs), null, 2),
  );

  // Remove the generated root index file produced by typedoc-plugin-markdown v4
  await fsPromises.unlink(path.join(OUTPUT_PATH, 'README.md')).catch(() => null);

  // Update each module's frontmatter and title
  // In v4, module files are identified by package name, not file path
  await Promise.all(
    modules.map(async ([name]) => {
      const filePath = path.join(OUTPUT_PATH, 'modules', convertPackageNameToModuleFileName(name));
      const isExists = await fsPromises
        .stat(filePath)
        .then(() => true)
        .catch(() => false);

      if (!isExists) {
        console.warn(`Module ${name} not found!`);
        return;
      }

      const oldContent = await fsPromises.readFile(filePath, 'utf-8');
      const necessaryPart = oldContent.split('\n').slice(5).join('\n');
      const finalContent = `# ${name}
${necessaryPart}`;
      await fsPromises.writeFile(filePath, finalContent);
    }),
  );

  // Write modules _meta.ts with proper package names as display labels
  const modulesDir = path.join(OUTPUT_PATH, 'modules');
  if (fs.existsSync(modulesDir)) {
    await fsPromises.writeFile(
      path.join(modulesDir, '_meta.ts'),
      'export default ' +
        JSON.stringify(
          Object.fromEntries(
            modules
              .map(([name]) => {
                const key = convertPackageNameToModuleFileName(name)
                  .replace(/\.md$/, '')
                  .toLowerCase();
                return [key, name];
              })
              .sort((a, b) => a[1].localeCompare(b[1])),
          ),
          null,
          2,
        ),
    );
  }

  function convertPackageNameToModuleFileName(packageName: string): string {
    // Mirrors typedoc's createNormalizedUrl: replace non-safe characters with '_'
    // then lowercase (matching typedoc's getFileName behaviour)
    const normalized = packageName.replace(/[^a-zA-Z0-9()+,\-._]/g, '_').toLowerCase();
    return `${normalized}.md`;
  }
}

buildApiDocs().catch(e => {
  console.error(e);
  process.exit(1);
});
