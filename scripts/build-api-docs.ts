import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import * as TypeDoc from 'typedoc';
import globby from 'globby';
import chalk from 'chalk';
import workspacePackageJson from '../package.json';

const MONOREPO = workspacePackageJson.name.replace('-monorepo', '');
const CWD = process.cwd();
// Where to generate the API docs
const OUTPUT_PATH = path.join(CWD, 'website/docs/api');
const SIDEBAR_PATH = path.join(CWD, 'website/api-sidebar.json');

async function buildApiDocs() {
  // An array of tuples where the first element is the package's name and the
  // the second element is the relative path to the package's entry point
  const packageJsonFiles = globby.sync(workspacePackageJson.workspaces.map(f => `${f}/package.json`));
  const modules: [string, string][] = [];

  for (const packageJsonPath of packageJsonFiles) {
    const packageJsonContent = require(path.join(CWD, packageJsonPath));
    // Do not include private and large npm package that contains rest
    if (
      !packageJsonPath.includes('./website/') &&
      !packageJsonContent.private &&
      packageJsonContent.name !== MONOREPO &&
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
  const typeDoc = new TypeDoc.Application();

  typeDoc.options.addReader(new TypeDoc.TSConfigReader());

  typeDoc.bootstrap({
    excludePrivate: true,
    excludeProtected: true,
    readme: 'none',
    hideGenerator: true,
    // @ts-ignore -- typedoc-plugin-markdown option
    hideBreadcrumbs: true,
    gitRevision: 'master',
    tsconfig: path.resolve(CWD, 'tsconfig.json'),
    entryPoints: modules.map(([_name, filePath]) => filePath),
  });

  // Generate the API docs
  const project = typeDoc.convert();
  await typeDoc.generateDocs(project as any, OUTPUT_PATH);

  async function patchMarkdownFile(filePath: string) {
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
      .replace(/\[([^\]]+)]\((\.\.\/(classes|interfaces|enums)\/([^)]+))\)/g, '[$1](/docs/api/$3/$4)');

    console.log('✅ ', chalk.green(path.relative(CWD, filePath)));
    await fsPromises.writeFile(filePath, contentsTrimmed);
  }

  async function visitMarkdownFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.warn(`${filePath} doesn't exist! Ignoring.`);
      return;
    }
    const lsStat = await fsPromises.lstat(filePath);
    if (lsStat.isFile()) {
      await patchMarkdownFile(filePath);
    } else {
      const filesInDirectory = await fsPromises.readdir(filePath);
      await Promise.all(filesInDirectory.map(fileName => visitMarkdownFile(path.join(filePath, fileName))));
    }
  }

  // Patch the generated markdown
  // See https://github.com/tgreyuk/typedoc-plugin-markdown/pull/128
  await Promise.all(
    ['classes', 'enums', 'interfaces', 'modules'].map(async dirName => {
      const subDirName = path.join(OUTPUT_PATH, dirName);
      await visitMarkdownFile(subDirName);
    })
  );

  // Remove the generated "README.md" file
  fs.unlinkSync(path.join(OUTPUT_PATH, 'README.md'));

  // Update each module 's frontmatter and title
  await Promise.all(
    modules.map(async ([name, originalFilePath]) => {
      const filePath = path.join(OUTPUT_PATH, 'modules', convertEntryFilePath(originalFilePath));
      const ifExists = await fsPromises
        .stat(filePath)
        .then(() => true)
        .catch(() => false);
      if (!ifExists) {
        console.warn(`Module ${name} not found!`);
        return;
      }
      const id = convertNameToId(name);
      const oldContent = fs.readFileSync(filePath, 'utf-8');
      const necessaryPart = oldContent.split('\n').slice(5).join('\n');
      const finalContent = `---
id: "${id}"
title: "${name}"
sidebar_label: "${id}"
---
${necessaryPart}`;
      await fsPromises.writeFile(filePath, finalContent);
    })
  );

  fs.writeFileSync(
    SIDEBAR_PATH,
    JSON.stringify(
      {
        $name: 'API Reference',
        _: Object.fromEntries(
          ['modules', 'classes', 'interfaces', 'enums'].map(key => [
            key,
            {
              $name: key[0].toUpperCase() + key.slice(1),
              $routes: getSidebarItemsByDirectory(path.join(OUTPUT_PATH, key)),
            },
          ])
        ),
      },
      null,
      2
    )
  );

  function convertEntryFilePath(filePath: string): string {
    const { dir, name } = path.parse(filePath);
    return `_${dir.split('/').join('_').replace(/-/g, '_')}_${name}_.md`
      .replace('_index_', '')
      .replace('_packages_', '');
  }

  function convertNameToId(name: string): string {
    return name.replace(`@${MONOREPO}/`, '');
  }

  function getSidebarItemsByDirectory(dirName: string): string[] {
    if (!fs.existsSync(dirName)) {
      console.warn(`${dirName} doesn't exist! Ignoring.`);
      return [];
    }
    const filesInDirectory = fs.readdirSync(dirName);
    return filesInDirectory
      .flatMap(fileName => {
        const absoluteFilePath = path.join(dirName, fileName);
        const fileLstat = fs.lstatSync(absoluteFilePath);
        if (fileLstat.isFile()) {
          return path.parse(fileName).name;
        }
        return getSidebarItemsByDirectory(absoluteFilePath);
      })
      .sort((a, b) => {
        const aName = a.split('.').pop() as string;
        const bName = b.split('.').pop() as string;
        if (aName < bName) {
          return -1;
        }
        if (aName > bName) {
          return 1;
        }
        return 0;
      });
  }
}

buildApiDocs().catch(e => {
  console.error(e);
  process.exit(1);
});
