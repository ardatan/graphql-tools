const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const TypeDoc = require('typedoc');
const { execSync } = require('child_process');

const MONOREPO = 'graphql-tools';

async function buildApiDocs() {
  // Where to generate the API docs
  const outputDir = path.join(__dirname, '../website/docs/api');
  const sidebarsPath = path.join(__dirname, '../website/api-sidebar.json');

  // Get the upstream git remote -- we don't want to assume it exists or is named "upstream"
  const gitRemote = execSync('git remote -v', { encoding: 'utf-8' })
    .split('\n')
    .map(line => line.split('\t'))
    .find(([_name, description]) => description.includes('(fetch)'));
  const gitRemoteName = gitRemote && gitRemote[0];
  if (!gitRemoteName) {
    console.log('Unable to locate upstream git remote');
    process.exit(1);
  }

  // An array of tuples where the first element is the package's name and the
  // the second element is the relative path to the package's entry point
  const workspacePackageJson = require('../package.json');
  const packageJsonFiles = require('globby').sync(workspacePackageJson.workspaces.map(f => `${f}/package.json`));
  const modules = [];
  for (const packageJsonPath of packageJsonFiles) {
    const packageJsonContent = require(path.join(__dirname, '..', packageJsonPath));
    // Do not include private and large npm package that contains rest
    if (!packageJsonContent.private && packageJsonContent.name !== MONOREPO) {
      modules.push([
        packageJsonContent.name,
        packageJsonPath.replace('./', '').replace('package.json', 'src/index.ts'),
      ]);
    }
  }

  // Delete existing docs
  rimraf.sync(outputDir);

  // Initialize TypeDoc
  const typeDoc = new TypeDoc.Application();

  typeDoc.options.addReader(new TypeDoc.TSConfigReader());

  typeDoc.bootstrap({
    // mode: 'library',
    theme: path.resolve(__dirname, 'typedoc-theme'),
    // ignoreCompilerErrors: true,
    excludePrivate: true,
    excludeProtected: true,
    // stripInternal: true,
    readme: 'none',
    hideGenerator: true,
    hideBreadcrumbs: true,
    // skipSidebar: true,
    gitRemote: gitRemoteName,
    gitRevision: 'master',
    tsconfig: path.resolve(__dirname, '../tsconfig.build.json'),
    entryPoints: modules.map(([_name, filePath]) => filePath),
  });

  // Generate the API docs
  const project = typeDoc.convert(typeDoc.expandInputFiles(modules.map(([_name, filePath]) => filePath)));
  await typeDoc.generateDocs(project, outputDir);

  // Patch the generated markdown
  // See https://github.com/tgreyuk/typedoc-plugin-markdown/pull/128
  ['classes', 'enums', 'interfaces', 'modules'].forEach(dirName => {
    fs.readdirSync(path.join(outputDir, dirName)).forEach(fileName => {
      const filePath = path.join(outputDir, dirName, fileName);
      const contents = fs
        .readFileSync(filePath, 'utf-8')
        // Escape angle brackets
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Fix links
        .replace(/\[([^\]]+)\]\(([^)]+).md\)/g, '[$1]($2)')
        .replace(/\[([^\]]+)\]\((\.\.\/(classes|interfaces|enums)\/([^\)]+))\)/g, '[$1](/docs/api/$3/$4)');
      fs.writeFileSync(filePath, contents);
    });
  });

  // Remove the generated "index.md" file
  // fs.unlinkSync(path.join(outputDir, 'index.md'));

  // Update each module 's frontmatter and title
  modules.forEach(([name, originalFilePath]) => {
    const filePath = path.join(outputDir, 'modules', convertEntryFilePath(originalFilePath));
    if (!fs.existsSync(filePath)) {
      console.warn(`Module ${name} not found!`);
      return;
    }
    const id = convertNameToId(name);
    const oldContent = fs.readFileSync(filePath, 'utf-8');
    const necessaryPart = oldContent.split('\n').slice(5).join('\n');
    const finalContent =
      `
---
id: "${id}"
title: "${name}"
sidebar_label: "${id}"
---
`.substring(1) + necessaryPart;
    fs.writeFileSync(filePath, finalContent);
  });

  fs.writeFileSync(sidebarsPath, JSON.stringify([
    {
      Modules: modules.map(([name]) => `api/modules/${convertNameToId(name)}`),
    },
    {
      Classes: getSidebarItemsByDirectory('classes'),
    },
    {
      Interfaces: getSidebarItemsByDirectory('interfaces'),
    },
    {
      Enums: getSidebarItemsByDirectory('enums'),
    },
  ], null, 2));

  function convertEntryFilePath(filePath) {
    const { dir, name } = path.parse(filePath);
    return `_${dir.split('/').join('_').replace(/-/g, '_')}_${name}_.md`
      .replace('_index_', '')
      .replace('_packages_', '');
  }

  function convertNameToId(name) {
    return name.replace(`@${MONOREPO}/`, '');
  }

  function getSidebarItemsByDirectory(dirName) {
    return fs
      .readdirSync(path.join(outputDir, dirName))
      .map(fileName => `api/${dirName}/${path.parse(fileName).name}`)
      .sort((a, b) => {
        const aName = a.split('.').pop();
        const bName = b.split('.').pop();
        if (aName < bName) {
          return -1;
        } else if (aName > bName) {
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
