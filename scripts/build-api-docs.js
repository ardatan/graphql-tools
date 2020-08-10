const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const TypeDoc = require('typedoc');
const { transpileModule } = require('typescript');
const { execSync } = require('child_process');

// Where to generate the API docs
const outputDir = path.join(__dirname, '../website/docs/api');
// sidebars.json
const sidebarsPath = path.join(__dirname, '../website/sidebars.json');

// Get the upstream git remote -- we don't want to assume it exists or is named "upstream"
const gitRemote = execSync('git remote -v', { encoding: 'utf-8' })
  .split('\n')
  .map(line => line.split('\t'))
  .find(
    ([_name, description]) =>
      description === 'git@github.com:ardatan/graphql-tools.git (fetch)' ||
      description === 'https://github.com/ardatan/graphql-tools.git (fetch)'
  );
const gitRemoteName = gitRemote && gitRemote[0];
if (!gitRemoteName) {
  console.log('Unable to locate upstream git remote');
  process.exit(1);
}

// An array of tuples where the first element is the package's name and the
// the second element is the relative path to the package's entry point
const modules = [
  ['@graphql-tools/schema', 'packages/schema/src/index.ts'],
  ['@graphql-tools/stitch', 'packages/stitch/src/index.ts'],
  ['@graphql-tools/wrap', 'packages/wrap/src/index.ts'],
  ['@graphql-tools/merge', 'packages/merge/src/index.ts'],
  ['@graphql-tools/mock', 'packages/mock/src/index.ts'],
  ['@graphql-tools/load', 'packages/load/src/index.ts'],
  ['@graphql-tools/load-files', 'packages/load-files/src/index.ts'],
  ['@graphql-tools/graphql-file-loader', 'packages/loaders/graphql-file/src/index.ts'],
  ['@graphql-tools/code-file-loader', 'packages/loaders/code-file/src/index.ts'],
  ['@graphql-tools/json-file-loader', 'packages/loaders/json-file/src/index.ts'],
  ['@graphql-tools/url-loader', 'packages/loaders/url/src/index.ts'],
  ['@graphql-tools/module-loader', 'packages/loaders/module/src/index.ts'],
  ['@graphql-tools/git-loader', 'packages/loaders/git/src/index.ts'],
  ['@graphql-tools/github-loader', 'packages/loaders/github/src/index.ts'],
  ['@graphql-tools/apollo-engine-loader', 'packages/loaders/apollo-engine/src/index.ts'],
  ['@graphql-tools/prisma-loader', 'packages/loaders/prisma/src/index.ts'],
  ['@graphql-tools/graphql-tag-pluck', 'packages/graphql-tag-pluck/src/index.ts'],
  ['@graphql-tools/utils', 'packages/utils/src/index.ts'],
];

// Delete existing docs
rimraf.sync(outputDir);

// Initialize TypeDoc
const typeDoc = new TypeDoc.Application();

typeDoc.options.addReader(new TypeDoc.TSConfigReader());

typeDoc.bootstrap({
  mode: 'library',
  logger: 'none',
  theme: 'docusaurus2',
  ignoreCompilerErrors: true,
  excludePrivate: true,
  excludeProtected: true,
  stripInternal: true,
  readme: 'none',
  hideGenerator: true,
  hideBreadcrumbs: true,
  skipSidebar: true,
  gitRemote: gitRemoteName,
  gitRevision: 'master',
});

// Generate the API docs
const project = typeDoc.convert(typeDoc.expandInputFiles(modules.map(([_name, filePath]) => filePath)));
typeDoc.generateDocs(project, outputDir);

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
fs.unlinkSync(path.join(outputDir, 'index.md'));

// Update each module 's frontmatter and title
modules.forEach(([name, originalFilePath]) => {
  const filePath = path.join(outputDir, 'modules', convertEntryFilePath(originalFilePath));
  if (!fs.existsSync(filePath)) {
    return;
  }
  const id = convertNameToId(name);
  fs.writeFileSync(
    filePath,
    fs.readFileSync(filePath, 'utf-8').replace(
      /^---.+---\n\n## Index/s,
      `
---
id: "${id}"
title: "${name}"
sidebar_label: "${id}"
---`.substring(1)
    )
  );
});

// Update sidebars.json
const sidebars = require(sidebarsPath);
sidebars.someSidebar.find(category => category['API Reference'])['API Reference'] = [
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
];
fs.writeFileSync(sidebarsPath, JSON.stringify(sidebars, null, 2));

function convertEntryFilePath(filePath) {
  const { dir, name } = path.parse(filePath);
  return `_${dir.split('/').slice(1).join('_').replace(/-/g, '_')}_${name}_.md`;
}

function convertNameToId(name) {
  return name.replace(/@graphql-tools\//g, '');
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
