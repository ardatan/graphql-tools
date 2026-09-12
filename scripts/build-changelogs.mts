/**
 * Copies every package's CHANGELOG.md into website/content/changelogs, one
 * page per package (`/changelogs/<package directory>` on the docs site), in
 * the content-only layout that the-guild-org/website renders. The output is
 * committed; .github/workflows/website-content.yaml regenerates it on master.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import globby from 'globby';

const CWD = process.cwd();
const OUTPUT_PATH = path.join(CWD, 'website/content/changelogs');

async function buildChangelogs(): Promise<void> {
  await fs.rm(OUTPUT_PATH, { recursive: true }).catch(() => null);

  const changelogs = globby.sync('packages/**/CHANGELOG.md', {
    cwd: CWD,
    ignore: ['**/node_modules/**'],
  });

  const written: Array<{ dir: string; name: string }> = [];
  for (const changelog of changelogs) {
    const packageDir = path.dirname(changelog);
    const { name } = JSON.parse(
      await fs.readFile(path.join(CWD, packageDir, 'package.json'), 'utf-8'),
    );
    const dir = packageDir.replace(/^packages\//, '');
    // The changelog's own H1 (the package name) goes; the title comes from frontmatter.
    const body = (await fs.readFile(path.join(CWD, changelog), 'utf-8'))
      .replace(/^# .+\n+/, '')
      .trim();
    // The API reference's module pages are titled by package name already;
    // the site rejects two pages with the same title.
    const frontmatter = [
      '---',
      `title: ${JSON.stringify(`${name} changelog`)}`,
      `sidebarTitle: ${JSON.stringify(name)}`,
      `description: ${JSON.stringify(`Every release of ${name} with its changes and the pull requests behind them.`)}`,
      '---',
    ].join('\n');
    const outputPath = path.join(OUTPUT_PATH, `${dir}.md`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${frontmatter}\n\n${body || 'No published releases yet.'}\n`);
    written.push({ dir, name });
  }

  // Sidebar order: the umbrella graphql-tools package first, then the rest by
  // directory name; packages under a shared directory (executors/, loaders/)
  // form a folder.
  const byDir = new Map<string, Array<{ key: string; name: string }>>();
  for (const { dir, name } of written) {
    const parent = path.posix.dirname(dir);
    const key = path.posix.basename(dir);
    const siblings = byDir.get(parent) ?? [];
    siblings.push({ key, name });
    byDir.set(parent, siblings);
  }
  const compare = (a: { key: string; name: string }, b: { key: string; name: string }) => {
    if (a.key === 'graphql-tools') return -1;
    if (b.key === 'graphql-tools') return 1;
    return a.key.localeCompare(b.key);
  };
  for (const [parent, siblings] of byDir) {
    const folders = [...byDir.keys()].filter(
      dir => dir !== '.' && path.posix.dirname(dir) === parent,
    );
    const pages = [
      ...siblings.sort(compare).map(sibling => sibling.key),
      ...folders.sort().map(folder => path.posix.basename(folder)),
    ];
    const title = parent === '.' ? 'Changelogs' : parent.charAt(0).toUpperCase() + parent.slice(1);
    await fs.writeFile(
      path.join(OUTPUT_PATH, parent === '.' ? '' : parent, 'meta.json'),
      `${JSON.stringify({ title, pages }, null, 2)}\n`,
    );
  }

  console.log('✅ ', styleText('green', `${written.length} changelogs written to ${OUTPUT_PATH}`));
}

buildChangelogs().catch(e => {
  console.error(e);
  process.exit(1);
});
