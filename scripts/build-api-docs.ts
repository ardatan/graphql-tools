import fs, { promises as fsPromises } from 'node:fs';
import path, { join } from 'node:path';
import chalk from 'chalk';
import globby from 'globby';
import { Application, TSConfigReader } from 'typedoc';
import workspacePackageJson from '../package.json';

const shikiJsVsCodeTextMatePackageJsonPath = join(
  __dirname,
  '../node_modules/@shikijs/vscode-textmate/package.json',
);
const shikiJsVsCodeTextMatePackageJson = JSON.parse(
  fs.readFileSync(shikiJsVsCodeTextMatePackageJsonPath, 'utf-8'),
);
shikiJsVsCodeTextMatePackageJson.exports['.'] = {
  default: './dist/index.mjs',
  types: './dist/index.d.mts',
};
fs.writeFileSync(
  shikiJsVsCodeTextMatePackageJsonPath,
  JSON.stringify(shikiJsVsCodeTextMatePackageJson, null, 2),
);

const MONOREPO = workspacePackageJson.name.replace('-monorepo', '');
const CWD = process.cwd();
// Where to generate the API docs
const OUTPUT_PATH = path.join(CWD, 'website/src/pages/docs/api');

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
    },
    [new TSConfigReader()],
  );

  // Generate the API docs
  const project = await typeDoc.convert();
  await typeDoc.generateDocs(project!, OUTPUT_PATH);

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
        /\[([^\]]+)]\((\.\.\/(classes|interfaces|enums)\/([^)]+))\)/g,
        '[$1](/docs/api/$3/$4)',
      );

    await fsPromises.writeFile(filePath, contentsTrimmed);
    const relativePath = path.relative(CWD, filePath);
    const newFileName = relativePath.toLowerCase();
    await fsPromises.rename(filePath, newFileName);
    console.log('✅ ', chalk.green(newFileName));
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
    ['classes', 'enums', 'interfaces', 'modules'].map(async dirName => {
      const subDirName = path.join(OUTPUT_PATH, dirName);
      await visitMarkdownFile(subDirName);
    }),
  );
  await fsPromises.writeFile(
    path.join(OUTPUT_PATH, '_meta.ts'),
    'export default ' +
      JSON.stringify(
        {
          modules: 'Packages',
          classes: 'Classes',
          enums: 'Enums',
          interfaces: 'Interfaces',
        },
        null,
        2,
      ),
  );

  // Remove the generated "README.md" file
  // await fsPromises.unlink(path.join(OUTPUT_PATH, 'README.md'));

  // Update each module 's frontmatter and title
  await Promise.all(
    modules.map(async ([name, originalFilePath]) => {
      const filePath = path.join(OUTPUT_PATH, 'modules', convertEntryFilePath(originalFilePath));
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

  function convertEntryFilePath(filePath: string): string {
    const { dir, name } = path.parse(filePath);
    return `_${dir.replace(/[-/]/g, '_')}_${name}_.md`.replace(/_index_|_packages_/g, '');
  }
}

buildApiDocs().catch(e => {
  console.error(e);
  process.exit(1);
});
