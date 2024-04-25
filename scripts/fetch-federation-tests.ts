import { mkdirSync, rmdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const baseUrl = 'https://federation-compatibility.the-guild.dev';
const fixturesPath = join(
  __dirname,
  '..',
  'packages',
  'federation',
  'test',
  'fixtures',
  'federation-compatibility',
);

async function main() {
  rmdirSync(fixturesPath, { recursive: true });
  const supergraphPathListRes = await fetch(`${baseUrl}/supergraphs`);
  const supergraphPathList = await supergraphPathListRes.json();
  for (const supergraphPath of supergraphPathList) {
    if (supergraphPath) {
      const supergraphRes = await fetch(supergraphPath);
      const supergraphPathParts = supergraphPath.split('/');
      const supergraphName = supergraphPathParts[supergraphPathParts.length - 2];
      const supergraphSdl = await supergraphRes.text();
      const supergraphFixturesDir = join(fixturesPath, supergraphName);
      mkdirSync(supergraphFixturesDir, { recursive: true });
      writeFileSync(join(supergraphFixturesDir, 'supergraph.graphql'), supergraphSdl);
      const testsPath = supergraphPath.replace('/supergraph', '/tests');
      const testsRes = await fetch(testsPath);
      const testsContent = await testsRes.json();
      writeFileSync(
        join(supergraphFixturesDir, 'tests.json'),
        JSON.stringify(testsContent, null, 2),
      );
    }
  }
}

main()
  .then(() => console.log('Done!'))
  .catch(err => console.error(err));
